"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS } from "@/lib/chartColors";

type StatusRow = { status: string; count: number };

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  delivered: "Delivered",
};

export function JobCardStatusChart({ data }: { data: StatusRow[] }) {
  const chartData = data.map((d) => ({
    label: STATUS_LABEL[d.status] ?? d.status,
    count: d.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Card Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill={CHART_COLORS.chart3} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
