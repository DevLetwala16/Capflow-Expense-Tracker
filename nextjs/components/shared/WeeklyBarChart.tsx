"use client";

import { format, parseISO, subDays } from "date-fns";
import { useState } from "react";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

interface WeeklyBarChartProps {
  data: { day: string; amount: number }[];
  currency: string;
}

export function WeeklyBarChart({ data, currency }: WeeklyBarChartProps) {
  const [tooltip, setTooltip] = useState<{ day: string; amount: number } | null>(null);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const today = format(new Date(), "yyyy-MM-dd");
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="relative">
      {/* Tooltip */}
      {tooltip && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#111827] text-white text-xs px-2 py-1 rounded-lg pointer-events-none z-10 whitespace-nowrap">
          {symbol}{tooltip.amount.toLocaleString()} on {format(parseISO(tooltip.day), "EEE, MMM d")}
        </div>
      )}

      <div className="flex items-end gap-1.5 h-24">
        {data.map((d) => {
          const isToday = d.day === today;
          const heightPercent = maxAmount > 0 ? (d.amount / maxAmount) * 100 : 0;
          const dayLabel = format(parseISO(d.day), "EEEEE");

          return (
            <div
              key={d.day}
              className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
              onMouseEnter={() => setTooltip(d)}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => setTooltip(tooltip?.day === d.day ? null : d)}
            >
              <div className="w-full flex items-end justify-center h-16">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    isToday
                      ? "bg-[#6366F1]"
                      : d.amount > 0
                      ? "bg-[#6366F1]/40"
                      : "bg-[var(--border-color)]"
                  }`}
                  style={{
                    height: `${Math.max(heightPercent, d.amount > 0 ? 8 : 3)}%`,
                    minHeight: "3px",
                  }}
                />
              </div>
              <span
                className={`text-[9px] font-medium ${
                  isToday ? "text-[#6366F1]" : "text-[var(--text-secondary)]"
                }`}
              >
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
