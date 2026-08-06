"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  AlertCircle,
  Search,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TodayAttendanceSummary, TodayAttendanceItem } from "@/actions/dashboard";

type FilterStatus = "all" | "present" | "half_day" | "absent" | "leave" | "unmarked";

function getStatusDetails(status: TodayAttendanceItem["status"]) {
  switch (status) {
    case "present":
      return {
        label: "Present",
        labelBn: "উপস্থিত",
        badgeVariant: "success" as const,
        icon: CheckCircle2,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        avatarBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
      };
    case "half_day":
      return {
        label: "Half Day",
        labelBn: "হাফ ডে",
        badgeVariant: "warning" as const,
        icon: Clock,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
        avatarBg: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
      };
    case "absent":
      return {
        label: "Absent",
        labelBn: "অনুপস্থিত",
        badgeVariant: "destructive" as const,
        icon: XCircle,
        color: "text-rose-500",
        bgColor: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
        avatarBg: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
      };
    case "leave":
      return {
        label: "On Leave",
        labelBn: "ছুটিতে",
        badgeVariant: "secondary" as const,
        icon: CalendarOff,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
        avatarBg: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
      };
    case "unmarked":
    default:
      return {
        label: "Unmarked",
        labelBn: "হিসাব বাকি",
        badgeVariant: "outline" as const,
        icon: AlertCircle,
        color: "text-muted-foreground",
        bgColor: "bg-muted/50 border-border text-muted-foreground",
        avatarBg: "bg-muted text-muted-foreground",
      };
  }
}

function formatTime(isoString?: string | null) {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function EmployeeAttendancePanel({ summary }: { summary: TodayAttendanceSummary }) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  const filteredRecords = useMemo(() => {
    return summary.records.filter((item) => {
      // Filter by status
      if (filter === "present" && item.status !== "present" && item.status !== "half_day") {
        return false;
      }
      if (filter !== "all" && filter !== "present" && item.status !== filter) {
        return false;
      }

      // Filter by search text
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesignation = item.designation?.toLowerCase().includes(query) ?? false;
        const matchesPhone = item.phone?.includes(query) ?? false;
        return matchesName || matchesDesignation || matchesPhone;
      }

      return true;
    });
  }, [summary.records, filter, search]);

  const presentPercentage = summary.totalEmployees > 0
    ? Math.round((summary.presentCount / summary.totalEmployees) * 100)
    : 0;
  const halfDayPercentage = summary.totalEmployees > 0
    ? Math.round((summary.halfDayCount / summary.totalEmployees) * 100)
    : 0;
  const leavePercentage = summary.totalEmployees > 0
    ? Math.round((summary.leaveCount / summary.totalEmployees) * 100)
    : 0;
  const absentPercentage = summary.totalEmployees > 0
    ? Math.round((summary.absentCount / summary.totalEmployees) * 100)
    : 0;
  const unmarkedPercentage = summary.totalEmployees > 0
    ? Math.max(0, 100 - (presentPercentage + halfDayPercentage + leavePercentage + absentPercentage))
    : 0;

  return (
    <Card className="overflow-hidden border-border/80 bg-card/95 shadow-sm backdrop-blur-xs">
      <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCheck className="size-4" />
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight">
              Today&apos;s Employee Attendance
            </CardTitle>
          </div>
          <CardDescription className="mt-1 text-xs text-muted-foreground">
            {summary.formattedDate} • {summary.totalEmployees} Active Employees
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/attendance">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
              <span>Manage Attendance</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Stat Pill Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {/* Present */}
          <button
            type="button"
            onClick={() => setFilter(filter === "present" ? "all" : "present")}
            className={cn(
              "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
              filter === "present"
                ? "border-emerald-500/50 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/30"
                : "border-border/60 bg-muted/20 hover:border-emerald-500/30 hover:bg-emerald-500/5"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Present</span>
              <CheckCircle2 className="size-3.5 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {summary.presentCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({presentPercentage}%)
              </span>
            </div>
          </button>

          {/* Half Day */}
          <button
            type="button"
            onClick={() => setFilter(filter === "half_day" ? "all" : "half_day")}
            className={cn(
              "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
              filter === "half_day"
                ? "border-amber-500/50 bg-amber-500/10 shadow-xs ring-1 ring-amber-500/30"
                : "border-border/60 bg-muted/20 hover:border-amber-500/30 hover:bg-amber-500/5"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Half Day</span>
              <Clock className="size-3.5 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {summary.halfDayCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({halfDayPercentage}%)
              </span>
            </div>
          </button>

          {/* Absent */}
          <button
            type="button"
            onClick={() => setFilter(filter === "absent" ? "all" : "absent")}
            className={cn(
              "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
              filter === "absent"
                ? "border-rose-500/50 bg-rose-500/10 shadow-xs ring-1 ring-rose-500/30"
                : "border-border/60 bg-muted/20 hover:border-rose-500/30 hover:bg-rose-500/5"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Absent</span>
              <XCircle className="size-3.5 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {summary.absentCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({absentPercentage}%)
              </span>
            </div>
          </button>

          {/* On Leave */}
          <button
            type="button"
            onClick={() => setFilter(filter === "leave" ? "all" : "leave")}
            className={cn(
              "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
              filter === "leave"
                ? "border-purple-500/50 bg-purple-500/10 shadow-xs ring-1 ring-purple-500/30"
                : "border-border/60 bg-muted/20 hover:border-purple-500/30 hover:bg-purple-500/5"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">On Leave</span>
              <CalendarOff className="size-3.5 text-purple-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                {summary.leaveCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({leavePercentage}%)
              </span>
            </div>
          </button>

          {/* Unmarked */}
          <button
            type="button"
            onClick={() => setFilter(filter === "unmarked" ? "all" : "unmarked")}
            className={cn(
              "col-span-2 sm:col-span-1 flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
              filter === "unmarked"
                ? "border-muted-foreground/50 bg-muted shadow-xs ring-1 ring-muted-foreground/30"
                : "border-border/60 bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/40"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Unmarked</span>
              <AlertCircle className="size-3.5 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {summary.unmarkedCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({unmarkedPercentage}%)
              </span>
            </div>
          </button>
        </div>

        {/* Multi-segment Visual Progress Bar */}
        {summary.totalEmployees > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                Attendance Rate: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{summary.attendanceRate}%</span>
              </span>
              <span>
                {summary.totalPresent} Present of {summary.totalEmployees} Staff
              </span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
              {presentPercentage > 0 && (
                <div
                  style={{ width: `${presentPercentage}%` }}
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  title={`Present: ${summary.presentCount}`}
                />
              )}
              {halfDayPercentage > 0 && (
                <div
                  style={{ width: `${halfDayPercentage}%` }}
                  className="h-full rounded-full bg-amber-500 transition-all duration-500 ml-0.5"
                  title={`Half Day: ${summary.halfDayCount}`}
                />
              )}
              {leavePercentage > 0 && (
                <div
                  style={{ width: `${leavePercentage}%` }}
                  className="h-full rounded-full bg-purple-500 transition-all duration-500 ml-0.5"
                  title={`On Leave: ${summary.leaveCount}`}
                />
              )}
              {absentPercentage > 0 && (
                <div
                  style={{ width: `${absentPercentage}%` }}
                  className="h-full rounded-full bg-rose-500 transition-all duration-500 ml-0.5"
                  title={`Absent: ${summary.absentCount}`}
                />
              )}
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search staff name or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "ghost"}
              onClick={() => setFilter("all")}
              className="h-7 px-2.5 text-xs font-normal"
            >
              All ({summary.totalEmployees})
            </Button>
            <Button
              size="sm"
              variant={filter === "present" ? "default" : "ghost"}
              onClick={() => setFilter("present")}
              className="h-7 px-2.5 text-xs font-normal"
            >
              Present ({summary.totalPresent})
            </Button>
            <Button
              size="sm"
              variant={filter === "absent" ? "default" : "ghost"}
              onClick={() => setFilter("absent")}
              className="h-7 px-2.5 text-xs font-normal"
            >
              Absent ({summary.absentCount})
            </Button>
            <Button
              size="sm"
              variant={filter === "leave" ? "default" : "ghost"}
              onClick={() => setFilter("leave")}
              className="h-7 px-2.5 text-xs font-normal"
            >
              Leave ({summary.leaveCount})
            </Button>
            <Button
              size="sm"
              variant={filter === "unmarked" ? "default" : "ghost"}
              onClick={() => setFilter("unmarked")}
              className="h-7 px-2.5 text-xs font-normal"
            >
              Unmarked ({summary.unmarkedCount})
            </Button>
          </div>
        </div>

        {/* Employee List */}
        <div className="max-h-[360px] overflow-y-auto rounded-xl border border-border/70 divide-y divide-border/50">
          {summary.totalEmployees === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Users className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No active employees</p>
              <p className="text-xs text-muted-foreground/80 mt-0.5">
                Add staff members from the Employees section.
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Search className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No staff matching criteria</p>
              <p className="text-xs text-muted-foreground/80 mt-0.5">
                Try clearing the search query or status filter.
              </p>
            </div>
          ) : (
            filteredRecords.map((item) => {
              const details = getStatusDetails(item.status);
              const StatusIcon = details.icon;
              const inTime = formatTime(item.checkIn);
              const outTime = formatTime(item.checkOut);

              return (
                <div
                  key={item.employeeId}
                  className="flex items-center justify-between p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wider",
                        details.avatarBg
                      )}
                    >
                      {getInitials(item.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/employees/${item.employeeId}`}
                          className="truncate font-medium text-sm hover:underline hover:text-primary"
                        >
                          {item.name}
                        </Link>
                        {item.departments && item.departments.length > 0 && (
                          <Badge variant="outline" className="hidden sm:inline-flex text-[10px] py-0 px-1.5 uppercase font-medium">
                            {item.departments[0]}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.designation || "Staff"}</span>
                        {(inTime || outTime) && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px] text-foreground/80">
                              {inTime ? `In: ${inTime}` : ""}
                              {outTime ? ` | Out: ${outTime}` : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.hoursWorked > 0 && (
                      <span className="hidden sm:inline-block font-mono text-xs text-muted-foreground">
                        {item.hoursWorked.toFixed(1)} hrs
                      </span>
                    )}
                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                        details.bgColor
                      )}
                    >
                      <StatusIcon className="size-3.5 shrink-0" />
                      <span>{details.label}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
