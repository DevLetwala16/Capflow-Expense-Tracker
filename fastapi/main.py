"""
FastAPI Analytics Microservice — CapFlow
Phase 5 / Step 4.6

POST /analyze
  Input:  { transactions: [...], range: { startDate, endDate }, groupBy: "category" | "paymentMethod" }
  Output: { donut: [...], stackedBar: [...], lineTrend: [...], insights: [...] }

Stateless — never persists any data.
CORS locked to ALLOWED_ORIGINS env var.
"""

from __future__ import annotations

import os
from collections import defaultdict
from datetime import date, timedelta
from typing import Any, Literal

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ─── App Setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CapFlow Analytics",
    version="1.0.0",
    description="Stateless analytics microservice for the CapFlow expense tracker",
)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://capflow.vercel.app",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ─── Request / Response Models ────────────────────────────────────────────────

class DateRange(BaseModel):
    startDate: str  # "YYYY-MM-DD"
    endDate: str    # "YYYY-MM-DD"


class Transaction(BaseModel):
    id: int | None = None
    userId: str = ""
    type: Literal["expense", "income"]
    amount: float
    currency: str = "INR"
    categoryId: int
    title: str = ""
    date: str           # "YYYY-MM-DD"
    paymentMethod: str = "cash"
    notes: str | None = None


class Category(BaseModel):
    id: int
    name: str
    color: str = "#94A3B8"
    icon: str = "circle-ellipsis"
    type: str = "expense"


class AnalyzeRequest(BaseModel):
    transactions: list[Transaction]
    categories: list[Category] = Field(default_factory=list)
    range: DateRange
    groupBy: Literal["category", "paymentMethod"] = "category"
    currency: str = "INR"


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
    data: dict[str, float] = Field(default_factory=dict)


class DailyTrendEntry(BaseModel):
    date: str
    label: str
    amount: float
    rolling7: float
    zScore: float | None = None
    stdDevUpper: float | None = None
    stdDevLower: float | None = None
    regressionTrend: float | None = None
    isAnomaly: bool = False


class InsightItem(BaseModel):
    id: str
    iconType: str
    text: str


class AnalyzeResponse(BaseModel):
    donut: list[DonutSlice]
    stackedBar: list[StackedBarEntry]
    lineTrend: list[DailyTrendEntry]
    insights: list[InsightItem]


# ─── Analytics Helpers ────────────────────────────────────────────────────────

CURRENCY_SYMBOLS = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥"}


def fmt_amount(amount: float, currency: str) -> str:
    sym = CURRENCY_SYMBOLS.get(currency, currency)
    return f"{sym}{amount:,.0f}"


def build_donut(df_exp: pd.DataFrame, cat_map: dict[int, Category]) -> list[DonutSlice]:
    if df_exp.empty:
        return []
    total = df_exp["amount"].sum()
    grouped = df_exp.groupby("categoryId").agg(amount=("amount", "sum"), count=("amount", "count")).reset_index()
    slices = []
    for _, row in grouped.sort_values("amount", ascending=False).iterrows():
        cat = cat_map.get(int(row["categoryId"]))
        slices.append(DonutSlice(
            categoryId=int(row["categoryId"]),
            name=cat.name if cat else "Unknown",
            color=cat.color if cat else "#94A3B8",
            icon=cat.icon if cat else "circle-ellipsis",
            amount=round(float(row["amount"]), 2),
            percent=round(float(row["amount"]) / total * 100, 1) if total > 0 else 0,
            count=int(row["count"]),
        ))
    return slices


def build_stacked_bar(df_exp: pd.DataFrame, cat_map: dict[int, Category], group_by: str, n_months: int = 6) -> list[StackedBarEntry]:
    today = date.today()
    months = []
    for i in range(n_months - 1, -1, -1):
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        months.append(f"{y}-{m:02d}")

    result = []
    for ym in months:
        y, m = map(int, ym.split("-"))
        label = date(y, m, 1).strftime("%b")
        start = f"{ym}-01"
        last_day = (date(y, m % 12 + 1, 1) - timedelta(days=1)).day if m < 12 else 31
        end = f"{ym}-{last_day:02d}"

        month_df = df_exp[(df_exp["date"] >= start) & (df_exp["date"] <= end)]
        data: dict[str, float] = {}

        if group_by == "category":
            for _, row in month_df.groupby("categoryId")["amount"].sum().items():
                cat_id = _  # category id
                cat = cat_map.get(int(cat_id))
                key = cat.name if cat else f"cat-{cat_id}"
                data[key] = round(float(row), 2)
        else:
            for pm, amt in month_df.groupby("paymentMethod")["amount"].sum().items():
                data[str(pm)] = round(float(amt), 2)

        result.append(StackedBarEntry(month=ym, label=label, data=data))
    return result


def build_daily_trend(df_exp: pd.DataFrame, date_range: DateRange) -> list[DailyTrendEntry]:
    start = date.fromisoformat(date_range.startDate)
    end = date.fromisoformat(date_range.endDate)
    days = [(start + timedelta(days=i)).isoformat() for i in range((end - start).days + 1)]

    daily_map: dict[str, float] = defaultdict(float)
    for _, row in df_exp.iterrows():
        daily_map[str(row["date"])] += float(row["amount"])

    amounts = np.array([daily_map.get(d, 0.0) for d in days], dtype=float)

    # 7-day rolling average
    rolling7 = np.array([
        amounts[max(0, i - 6): i + 1].mean()
        for i in range(len(amounts))
    ])

    # Z-scores for anomaly detection (FastAPI exclusive feature)
    std = amounts.std()
    mean = amounts.mean()
    z_scores = (amounts - mean) / std if std > 0 else np.zeros_like(amounts)

    # Linear regression trend line
    x = np.arange(len(amounts))
    if len(amounts) > 1:
        coef = np.polyfit(x, amounts, 1)
        trend = np.polyval(coef, x)
    else:
        trend = amounts.copy()

    entries = []
    for i, d in enumerate(days):
        d_obj = date.fromisoformat(d)
        label = f"{d_obj.day} {d_obj.strftime('%b')}"
        entries.append(DailyTrendEntry(
            date=d,
            label=label,
            amount=round(float(amounts[i]), 2),
            rolling7=round(float(rolling7[i]), 2),
            zScore=round(float(z_scores[i]), 3),
            stdDevUpper=round(float(mean + std), 2),
            stdDevLower=round(float(max(0.0, mean - std)), 2),
            regressionTrend=round(float(trend[i]), 2),
            isAnomaly=bool(abs(z_scores[i]) > 2.0),
        ))
    return entries


def build_insights(df_exp: pd.DataFrame, cat_map: dict[int, Category], currency: str) -> list[InsightItem]:
    insights: list[InsightItem] = []

    total = float(df_exp["amount"].sum()) if not df_exp.empty else 0.0
    n_days = df_exp["date"].nunique() or 1
    avg = total / n_days

    insights.append(InsightItem(id="avg", iconType="avg", text=f"Avg daily spend: {fmt_amount(avg, currency)}"))

    if not df_exp.empty:
        by_day = df_exp.groupby("date")["amount"].sum()
        peak_day = by_day.idxmax()
        peak_amt = by_day.max()
        d_obj = date.fromisoformat(str(peak_day))
        insights.append(InsightItem(
            id="peak", iconType="peak",
            text=f"Highest spending day: {d_obj.day} {d_obj.strftime('%b')} ({fmt_amount(peak_amt, currency)})"
        ))

        by_cat = df_exp.groupby("categoryId")["amount"].sum()
        top_cat_id = int(by_cat.idxmax())
        top_cat_amt = float(by_cat.max())
        cat = cat_map.get(top_cat_id)
        if cat:
            insights.append(InsightItem(
                id="top-cat", iconType="category",
                text=f"Top category: {cat.name} — {fmt_amount(top_cat_amt, currency)}"
            ))

    insights.append(InsightItem(id="total", iconType="total", text=f"Total spent: {fmt_amount(total, currency)}"))
    return insights


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "capflow-analytics"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    if not req.transactions:
        return AnalyzeResponse(donut=[], stackedBar=[], lineTrend=[], insights=[])

    # Build category lookup
    cat_map = {c.id: c for c in req.categories}

    # Convert to DataFrame
    df = pd.DataFrame([t.model_dump() for t in req.transactions])
    df["date"] = df["date"].astype(str)
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)

    # Filter to range
    df = df[(df["date"] >= req.range.startDate) & (df["date"] <= req.range.endDate)]
    df_exp = df[df["type"] == "expense"].copy()

    return AnalyzeResponse(
        donut=build_donut(df_exp, cat_map),
        stackedBar=build_stacked_bar(df_exp, cat_map, req.groupBy),
        lineTrend=build_daily_trend(df_exp, req.range),
        insights=build_insights(df_exp, cat_map, req.currency),
    )
