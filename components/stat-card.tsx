"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHART_COLORS } from "@/lib/chartColors";

export type StatCardProps = {
  title: string;
  value: string;
  trend?: { label: string; positive: boolean };
  sparkline?: { value: number }[];
  sparklineColor?: string;
};

export function StatCard({
  title,
  value,
  trend,
  sparkline,
  sparklineColor = CHART_COLORS.chart3,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        {trend && (
          <Badge variant={trend.positive ? "success" : "destructive"}>{trend.label}</Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {sparkline && sparkline.length > 1 && (
          <div className="mt-3 h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline}>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor}
                  fill={sparklineColor}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
