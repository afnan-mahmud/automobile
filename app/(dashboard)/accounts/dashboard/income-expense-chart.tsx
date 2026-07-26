"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CHART_COLORS } from "@/lib/chartColors";

type DayRow = { date: string; income: number; expense: number };

export function IncomeExpenseChart({ data }: { data: DayRow[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No transactions in this period yet.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="income" stroke={CHART_COLORS.success} name="Income" />
          <Line type="monotone" dataKey="expense" stroke={CHART_COLORS.destructive} name="Expense" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
