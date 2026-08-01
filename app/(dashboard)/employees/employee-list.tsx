"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AddEmployeeDialog } from "./add-employee-dialog";
import { Phone, Briefcase, DollarSign, ArrowRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type EmployeeRow = {
  _id: string;
  name: string;
  phone: string;
  designation?: string;
  departments?: string[];
  hourlyRate: number;
  active: boolean;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-indigo-500 to-blue-600",
  "from-sky-500 to-cyan-600",
  "from-teal-500 to-emerald-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
];
function avatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function EmployeeList({ initialEmployees }: { initialEmployees: EmployeeRow[] }) {
  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {initialEmployees.length} employee{initialEmployees.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-muted-foreground/40">·</span>
          <span className="text-sm text-success">
            {initialEmployees.filter((e) => e.active).length} active
          </span>
        </div>
        <AddEmployeeDialog />
      </div>

      {/* Empty state */}
      {initialEmployees.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Users className="size-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No employees yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add your first employee to get started</p>
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {initialEmployees.map((emp) => (
          <Link
            key={emp._id}
            href={`/employees/${emp._id}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            {/* Gradient header area */}
            <div className={cn("relative flex flex-col items-center pb-4 pt-6 px-5")}>
              <div className="absolute inset-x-0 top-0 h-20 opacity-10 bg-gradient-to-b from-primary to-transparent" />

              {/* Avatar */}
              <div
                className={cn(
                  "relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-bold text-white shadow-lg",
                  avatarGradient(emp.name)
                )}
              >
                {getInitials(emp.name)}
              </div>

              {/* Status dot */}
              <span
                className={cn(
                  "absolute right-4 top-4 size-2.5 rounded-full ring-2 ring-card",
                  emp.active ? "bg-emerald-500" : "bg-muted-foreground/30"
                )}
              />
            </div>

            {/* Name & designation */}
            <div className="px-5 pb-1 text-center flex flex-col items-center">
              <p className="font-semibold text-foreground truncate">{emp.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {emp.designation && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {emp.designation}
                  </span>
                )}
                {emp.departments && emp.departments.length > 0 && (
                  <>
                    {emp.designation && <span className="text-muted-foreground/40 text-[10px]">·</span>}
                    <div className="flex gap-1 flex-wrap justify-center mt-1">
                      {emp.departments.map((dept) => (
                        <span key={dept} className="text-[10px] font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                          {dept}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="mx-5 mt-4 grid grid-cols-2 divide-x rounded-xl border bg-muted/30">
              <div className="flex flex-col items-center py-2.5">
                <span className="text-xs text-muted-foreground">Rate</span>
                <span className="text-sm font-semibold text-foreground">৳{emp.hourlyRate}/hr</span>
              </div>
              <div className="flex flex-col items-center py-2.5">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge
                  variant={emp.active ? "success" : "outline"}
                  className="mt-0.5 scale-90 text-[10px]"
                >
                  {emp.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            {/* Phone */}
            <div className="mt-3 flex items-center gap-1.5 px-5 pb-4">
              <Phone className="size-3.5 text-primary/60" />
              <span className="text-xs text-muted-foreground">{emp.phone}</span>
            </div>

            {/* Footer */}
            <div className="mt-auto flex items-center justify-between border-t bg-muted/30 px-5 py-3">
              <span className="text-xs font-medium text-primary">View Profile</span>
              <ArrowRight className="size-3.5 text-primary transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
