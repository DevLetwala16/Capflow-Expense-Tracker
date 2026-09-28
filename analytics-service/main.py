"""
CapFlow Analytics Microservice
==============================
POST /analyze  →  { donut, stackedBar, lineTrend, insights }

Enhanced over jsEngine with:
  - z-score anomaly detection per day
  - ±1 std-dev rolling band
  - linear regression trend overlay
  - richer insight text (MoM change, fastest-growing category, anomaly count)
"""

from __future__ import annotations

import os
from datetime import date, timedelta, datetime
from typing import Any, Literal

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from scipy import stats

# ─── Config ───────────────────────────────────────────────────────────────────

load_dotenv()

FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "*")

app = FastAPI(
    title="CapFlow Analytics Service",
    version="1.0.0",
    description="Stateless analytics engine with pandas, z-score anomaly detection, and linear regression.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN] if FRONTEND_ORIGIN != "*" else ["*"],
    allow_credentials=FRONTEND_ORIGIN != "*",
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request / Response Models ─────────────────────────────────────────────────


class TransactionIn(BaseModel):
    id: int | None = None
    type: Literal["expense", "income"]
    amount: float
    currency: str = "INR"
    categoryId: int
    date: str  # "YYYY-MM-DD"
    paymentMethod: str
    title: str = ""
    notes: str | None = None


class CategoryIn(BaseModel):
    id: int
    name: str
    color: str = "#94A3B8"
    icon: str = "circle-ellipsis"
    type: Literal["expense", "income", "both"] = "expense"


class DateRangeIn(BaseModel):
    startDate: str  # "YYYY-MM-DD"
    endDate: str    # "YYYY-MM-DD"


class AnalyzeRequest(BaseModel):
    transactions: list[TransactionIn]
    categories: list[CategoryIn]
    range: DateRangeIn
    groupBy: Literal["category", "paymentMethod"] = "category"
    currency: str = "INR"
    numMonths: int = Field(default=6, ge=1, le=24)


# ─── Output models (typed for documentation; actual return is dict) ────────────


class DonutSlice(BaseModel):
    categoryId: int
    name: str
    color: str
    icon: str
    amount: float
    percent: float
    count: int


class StackedBarEntry(BaseModel):
    month: str
    label: str
    # additional dynamic keys added at runtime


class DailyTrendEntry(BaseModel):
    date: str
    label: str
    amount: float
    rolling7: float
    zScore: float
    stdDevUpper: float
    stdDevLower: float
    regressionTrend: float
    isAnomaly: bool


class InsightItem(BaseModel):
    id: str
    iconType: Literal["avg", "peak", "category", "total", "anomaly", "trend", "growth"]
    emoji: str | None = None
    text: str


class AnalyzeResponse(BaseModel):
    donut: list[dict[str, Any]]
    stackedBar: list[dict[str, Any]]
    lineTrend: list[dict[str, Any]]
    insights: list[dict[str, Any]]


# ─── Helpers ──────────────────────────────────────────────────────────────────


CURRENCY_SYMBOL: dict[str, str] = {
    "INR": "₹",
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
}


def _symbol(currency: str) -> str:
    return CURRENCY_SYMBOL.get(currency.upper(), currency)


def _fmt_money(amount: float, currency: str) -> str:
    sym = _symbol(currency)
    return f"{sym}{amount:,.0f}"


def _short_month(yyyymm: str) -> str:
    y, m = map(int, yyyymm.split("-"))
    return date(y, m, 1).strftime("%b")


def _short_day(date_str: str) -> str:
    d = date.fromisoformat(date_str)
    return f"{d.day} {d.strftime('%b')}"


def _last_day_of_month(year: int, month: int) -> int:
    # Use pandas to avoid manual edge-cases
    return pd.Timestamp(year, month, 1).days_in_month


def _month_list(num_months: int) -> list[str]:
    """Return last N months as YYYY-MM strings, oldest first."""
    today = date.today()
    months: list[str] = []
    for i in range(num_months - 1, -1, -1):
        # subtract i months from current month
        month_val = today.month - i
        year_val = today.year
        while month_val <= 0:
            month_val += 12
            year_val -= 1
        months.append(f"{year_val:04d}-{month_val:02d}")
    return months


# ─── Donut ────────────────────────────────────────────────────────────────────


def compute_donut(
    expenses_df: pd.DataFrame,
    cat_map: dict[int, CategoryIn],
) -> list[dict[str, Any]]:
    if expenses_df.empty:
        return []

    total = expenses_df["amount"].sum()
    grouped = (
        expenses_df.groupby("categoryId")
        .agg(amount=("amount", "sum"), count=("amount", "count"))
        .reset_index()
        .sort_values("amount", ascending=False)
    )

    result: list[dict[str, Any]] = []
    for _, row in grouped.iterrows():
        cat_id = int(row["categoryId"])
        cat = cat_map.get(cat_id)
        result.append(
            {
                "categoryId": cat_id,
                "name": cat.name if cat else "Unknown",
                "color": cat.color if cat else "#94A3B8",
                "icon": cat.icon if cat else "circle-ellipsis",
                "amount": round(float(row["amount"]), 2),
                "percent": round(float(row["amount"]) / total * 100, 1) if total > 0 else 0.0,
                "count": int(row["count"]),
            }
        )
    return result


# ─── Stacked Bar ──────────────────────────────────────────────────────────────


def compute_stacked_bar(
    all_expenses_df: pd.DataFrame,
    cat_map: dict[int, CategoryIn],
    group_by: Literal["category", "paymentMethod"],
    num_months: int,
) -> list[dict[str, Any]]:
    months = _month_list(num_months)
    result: list[dict[str, Any]] = []

    for month in months:
        y, m = map(int, month.split("-"))
        start = f"{month}-01"
        end = f"{month}-{_last_day_of_month(y, m):02d}"

        month_df = all_expenses_df[
            (all_expenses_df["date"] >= start) & (all_expenses_df["date"] <= end)
        ]

        entry: dict[str, Any] = {"month": month, "label": _short_month(month)}

        if month_df.empty:
            result.append(entry)
            continue

        if group_by == "category":
            for _, row in month_df.iterrows():
                cat = cat_map.get(int(row["categoryId"]))
                key = cat.name if cat else f"cat-{int(row['categoryId'])}"
                entry[key] = round(entry.get(key, 0.0) + float(row["amount"]), 2)
        else:
            for _, row in month_df.iterrows():
                key = str(row["paymentMethod"])
                entry[key] = round(entry.get(key, 0.0) + float(row["amount"]), 2)

        result.append(entry)

    return result


# ─── Line Trend (enhanced) ────────────────────────────────────────────────────


def compute_line_trend(
    expenses_df: pd.DataFrame,
    date_range: DateRangeIn,
) -> list[dict[str, Any]]:
    start = date.fromisoformat(date_range.startDate)
    end = date.fromisoformat(date_range.endDate)

    # Build full day list
    days: list[str] = []
    cursor = start
    while cursor <= end:
        days.append(cursor.isoformat())
        cursor += timedelta(days=1)

    # Daily totals
    if not expenses_df.empty:
        daily = (
            expenses_df.groupby("date")["amount"]
            .sum()
            .reindex(days, fill_value=0.0)
        )
    else:
        daily = pd.Series(0.0, index=days)

    amounts = daily.values.astype(float)
    n = len(amounts)

    # 7-day rolling average
    rolling7 = np.array(
        [amounts[max(0, i - 6) : i + 1].mean() for i in range(n)],
        dtype=float,
    )

    # 7-day rolling std dev
    rolling_std = np.array(
        [amounts[max(0, i - 6) : i + 1].std(ddof=0) for i in range(n)],
        dtype=float,
    )

    # z-score per day vs its own 7-day window
    z_scores = np.where(rolling_std > 0, (amounts - rolling7) / rolling_std, 0.0)

    std_upper = rolling7 + rolling_std
    std_lower = np.maximum(rolling7 - rolling_std, 0.0)

    # Linear regression over the full window
    if n > 1:
        x = np.arange(n, dtype=float)
        slope, intercept, *_ = stats.linregress(x, amounts)
        regression = intercept + slope * x
    else:
        regression = amounts.copy()

    result: list[dict[str, Any]] = []
    for i, day_str in enumerate(days):
        result.append(
            {
                "date": day_str,
                "label": _short_day(day_str),
                "amount": round(float(amounts[i]), 2),
                "rolling7": round(float(rolling7[i]), 2),
                "zScore": round(float(z_scores[i]), 4),
                "stdDevUpper": round(float(std_upper[i]), 2),
                "stdDevLower": round(float(std_lower[i]), 2),
                "regressionTrend": round(float(regression[i]), 2),
                "isAnomaly": bool(abs(float(z_scores[i])) > 2),
            }
        )
    return result


# ─── Insights (richer) ────────────────────────────────────────────────────────


def compute_insights(
    expenses_df: pd.DataFrame,
    all_expenses_df: pd.DataFrame,
    cat_map: dict[int, CategoryIn],
    date_range: DateRangeIn,
    currency: str,
    line_trend: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    sym = _symbol(currency)
    insights: list[dict[str, Any]] = []

    # ── 1. Avg daily spend ────────────────────────────────────────────────────
    if not expenses_df.empty:
        unique_days = expenses_df["date"].nunique() or 1
        total = expenses_df["amount"].sum()
        avg = total / unique_days
        insights.append(
            {
                "id": "avg",
                "iconType": "avg",
                "text": f"Avg daily spend: {_fmt_money(avg, currency)}",
            }
        )
    else:
        insights.append(
            {
                "id": "avg",
                "iconType": "avg",
                "text": f"Avg daily spend: {sym}0",
            }
        )

    # ── 2. Highest spending day ───────────────────────────────────────────────
    if not expenses_df.empty:
        by_day = expenses_df.groupby("date")["amount"].sum()
        peak_day = by_day.idxmax()
        peak_amt = by_day.max()
        insights.append(
            {
                "id": "peak",
                "iconType": "peak",
                "text": f"Highest spending day: {_short_day(peak_day)} ({_fmt_money(peak_amt, currency)})",
            }
        )

    # ── 3. Top category ───────────────────────────────────────────────────────
    if not expenses_df.empty:
        by_cat = expenses_df.groupby("categoryId")["amount"].sum()
        top_cat_id = int(by_cat.idxmax())
        top_cat_amt = by_cat.max()
        cat = cat_map.get(top_cat_id)
        cat_name = cat.name if cat else f"Category {top_cat_id}"
        insights.append(
            {
                "id": "top-cat",
                "iconType": "category",
                "text": f"Top category: {cat_name} — {_fmt_money(top_cat_amt, currency)}",
            }
        )

    # ── 4. Total spent ────────────────────────────────────────────────────────
    total_spent = expenses_df["amount"].sum() if not expenses_df.empty else 0.0
    insights.append(
        {
            "id": "total",
            "iconType": "total",
            "text": f"Total spent: {_fmt_money(total_spent, currency)}",
        }
    )

    # ── 5. Anomaly count ──────────────────────────────────────────────────────
    anomaly_count = sum(1 for day in line_trend if day.get("isAnomaly", False))
    if anomaly_count > 0:
        insights.append(
            {
                "id": "anomaly",
                "iconType": "anomaly",
                "emoji": "⚠️",
                "text": f"{anomaly_count} unusual spending day{'s' if anomaly_count != 1 else ''} detected",
            }
        )

    # ── 6. Month-over-month % change ─────────────────────────────────────────
    if not all_expenses_df.empty:
        today = date.today()
        curr_month = f"{today.year:04d}-{today.month:02d}"

        prev_month_date = date(today.year, today.month, 1) - timedelta(days=1)
        prev_month = f"{prev_month_date.year:04d}-{prev_month_date.month:02d}"

        curr_total = all_expenses_df[
            all_expenses_df["date"].str.startswith(curr_month)
        ]["amount"].sum()
        prev_total = all_expenses_df[
            all_expenses_df["date"].str.startswith(prev_month)
        ]["amount"].sum()

        if prev_total > 0:
            mom_pct = ((curr_total - prev_total) / prev_total) * 100
            direction = "↑" if mom_pct >= 0 else "↓"
            insights.append(
                {
                    "id": "mom",
                    "iconType": "trend",
                    "emoji": "📈" if mom_pct >= 0 else "📉",
                    "text": (
                        f"Month-over-month: {direction}{abs(mom_pct):.1f}% vs last month"
                    ),
                }
            )

    # ── 7. Fastest-growing category (current 30 days vs prior 30 days) ────────
    if not all_expenses_df.empty and len(cat_map) > 0:
        today = date.today()
        curr_end = today
        curr_start = today - timedelta(days=29)
        prev_end = curr_start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=29)

        curr_df = all_expenses_df[
            (all_expenses_df["date"] >= curr_start.isoformat())
            & (all_expenses_df["date"] <= curr_end.isoformat())
        ]
        prev_df = all_expenses_df[
            (all_expenses_df["date"] >= prev_start.isoformat())
            & (all_expenses_df["date"] <= prev_end.isoformat())
        ]

        if not curr_df.empty and not prev_df.empty:
            curr_by_cat = curr_df.groupby("categoryId")["amount"].sum()
            prev_by_cat = prev_df.groupby("categoryId")["amount"].sum()

            best_pct: float = 0.0
            best_cat_id: int | None = None

            for cat_id, curr_amt in curr_by_cat.items():
                prev_amt = prev_by_cat.get(cat_id, 0.0)
                if prev_amt > 0:
                    pct = ((curr_amt - prev_amt) / prev_amt) * 100
                    if pct > best_pct:
                        best_pct = pct
                        best_cat_id = int(cat_id)

            if best_cat_id is not None and best_pct > 0:
                cat = cat_map.get(best_cat_id)
                cat_name = cat.name if cat else f"Category {best_cat_id}"
                insights.append(
                    {
                        "id": "fastest-growing",
                        "iconType": "growth",
                        "emoji": "🚀",
                        "text": f"Fastest growing: {cat_name} +{best_pct:.1f}% vs prior 30 days",
                    }
                )

    return insights


# ─── Routes ───────────────────────────────────────────────────────────────────


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "capflow-analytics"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> dict[str, Any]:
    # ── Build DataFrames ──────────────────────────────────────────────────────
    cat_map: dict[int, CategoryIn] = {c.id: c for c in req.categories}

    if req.transactions:
        tx_df = pd.DataFrame([t.model_dump() for t in req.transactions])
    else:
        tx_df = pd.DataFrame(
            columns=["id", "type", "amount", "currency", "categoryId", "date", "paymentMethod", "title", "notes"]
        )

    # All expenses (for MoM / fastest-growing — not range-filtered)
    all_expenses_df = (
        tx_df[tx_df["type"] == "expense"].copy() if not tx_df.empty else tx_df.copy()
    )

    # Range-filtered expenses
    start = req.range.startDate
    end = req.range.endDate
    if not tx_df.empty:
        in_range_df = tx_df[(tx_df["date"] >= start) & (tx_df["date"] <= end)]
        expenses_df = in_range_df[in_range_df["type"] == "expense"].copy()
    else:
        expenses_df = tx_df.copy()

    # ── Compute outputs ───────────────────────────────────────────────────────
    donut = compute_donut(expenses_df, cat_map)
    stacked_bar = compute_stacked_bar(all_expenses_df, cat_map, req.groupBy, req.numMonths)
    line_trend = compute_line_trend(expenses_df, req.range)
    insights = compute_insights(
        expenses_df, all_expenses_df, cat_map, req.range, req.currency, line_trend
    )

    return {
        "donut": donut,
        "stackedBar": stacked_bar,
        "lineTrend": line_trend,
        "insights": insights,
    }
