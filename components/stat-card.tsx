"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHART_COLORS } from "@/lib/chartColors";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  title: string;
  value: string;
  trend?: { label: string; positive: boolean };
  sparkline?: { value: number }[];
  sparklineColor?: string;
  variant?: "default" | "primary";
  progress?: number; // 0-100
};

export function StatCard({
  title,
  value,
  trend,
  sparkline,
  sparklineColor = CHART_COLORS.chart3,
  variant = "default",
  progress,
}: StatCardProps) {
  const isPrimary = variant === "primary";

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        isPrimary && "bg-gradient-to-br from-primary to-[#4a1fb8] text-primary-foreground border-none shadow-[0_20px_40px_-15px_rgba(107,56,251,0.5)]"
      )}
    >
      {/* Decorative background blobs for primary variant */}
      {isPrimary && (
        <>
          <div className="absolute -top-10 -right-10 size-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 size-32 rounded-full bg-black/10 blur-2xl" />
        </>
      )}

      <CardHeader className="relative z-10 flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className={cn("text-sm font-medium", isPrimary ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {title}
        </CardTitle>
        {trend && (
          <Badge variant={isPrimary ? "secondary" : (trend.positive ? "success" : "destructive")} className={cn(isPrimary && "bg-white/20 hover:bg-white/30 text-white border-none")}>
            {trend.label}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="relative z-10 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
        </div>

        {progress !== undefined && (
          <div className="relative size-14 flex items-center justify-center shrink-0">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <path
                className={cn("fill-none stroke-current opacity-20", isPrimary ? "text-white" : "text-muted")}
                strokeWidth="4"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={cn("fill-none stroke-current", isPrimary ? "text-white" : "text-primary")}
                strokeWidth="4"
                strokeDasharray={`${progress}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-bold">{progress}%</span>
            </div>
          </div>
        )}
      </CardContent>
      {sparkline && sparkline.length > 1 && !progress && (
        <div className="mt-2 h-16 w-full opacity-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPrimary ? "rgba(255,255,255,0.5)" : sparklineColor}
                fill={isPrimary ? "rgba(255,255,255,0.2)" : sparklineColor}
                fillOpacity={isPrimary ? 1 : 0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
