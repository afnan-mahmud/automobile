import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth, requirePageRole } from "@/lib/auth";
import {
  getEmployeeById,
  getAttendanceByEmployee,
  getEmployeeWorkReport,
} from "@/actions/employees";
import { SalaryHistory } from "./salary-history";
import {
  User,
  Phone,
  Briefcase,
  Clock,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  CheckCircle2,
  Shield,
  Lock,
  KeyRound,
  UserCheck,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EditEmployeeDialog } from "./edit-employee-dialog";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(["admin"]);
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";
  const { id } = await params;

  const employee = await getEmployeeById(id);
  if (!employee) {
    notFound();
  }

  const from = daysAgo(30);
  const to = new Date().toISOString();

  const [attendance, workReport] = await Promise.all([
    getAttendanceByEmployee(id, from, to),
    getEmployeeWorkReport(id, from, to),
  ]);

  const hasLogin = Boolean(employee.userId);

  const reqHours = employee.requiredHoursPerDay || 8;
  const totalOvertimeHours = attendance.reduce((sum: number, a: any) => {
    if (a.status === "absent") return sum;
    return sum + Math.max(0, (a.hoursWorked || 0) - reqHours);
  }, 0);
  const otRate = employee.overtimeHourlyRate || employee.hourlyRate;
  const estOvertimeEarned = totalOvertimeHours * otRate;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
      {/* ── MAIN COLUMN ── */}
      <div className="space-y-6">
        {/* HERO BOX */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <User className="size-5" />
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Employee Profile
                  </p>
                  <EditEmployeeDialog employee={employee} isAdmin={isAdmin} />
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap mt-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {employee.name}
                </h1>
                {hasLogin ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1.5 py-1 px-3"
                  >
                    <Shield className="size-3.5" />
                    Dashboard: <span className="capitalize font-semibold">{employee.userId?.role}</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1.5 py-1 px-3"
                  >
                    <Lock className="size-3.5" /> No Login
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-background/60 backdrop-blur-md border px-5 py-3 shadow-sm">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                <Briefcase className="size-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {employee.designation || "Staff"}
                </p>
                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {employee.departments?.length
                    ? employee.departments.join(", ")
                    : "No Department"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-4 text-center overflow-hidden">
            <div className="mb-2 rounded-full bg-muted p-2 shadow-sm text-muted-foreground">
              <Phone className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">
              Contact
            </p>
            <p className="mt-1 font-semibold text-sm">{employee.phone}</p>
            {employee.email && (
              <p className="text-[10px] text-muted-foreground truncate w-full mt-0.5">
                {employee.email}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-4 text-center">
            <div className="mb-2 rounded-full bg-muted p-2 shadow-sm text-muted-foreground">
              <Clock className="size-5" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">
              Salary & Rates
            </p>
            <p className="mt-1 font-semibold text-sm">
              {employee.salaryType === "daily"
                ? `৳${employee.salaryAmount || (employee.hourlyRate * (employee.requiredHoursPerDay || 8))}/d`
                : `৳${employee.salaryAmount || (employee.hourlyRate * 30 * (employee.requiredHoursPerDay || 8))}/m`}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ৳{employee.hourlyRate}/h · OT: ৳{employee.overtimeHourlyRate || employee.hourlyRate}/h
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border bg-emerald-50/50 p-4 text-center text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
            <div className="mb-2 rounded-full bg-background/50 p-2 shadow-sm backdrop-blur-sm text-emerald-600 dark:text-emerald-400">
              <CalendarCheck className="size-5" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">
              Hours (30d)
            </p>
            <p className="mt-1 font-semibold">{workReport.totalHours.toFixed(1)}h</p>
            <p className="text-[10px] opacity-80 mt-0.5">{reqHours}h/day req</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border bg-amber-50/50 p-4 text-center text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">
            <div className="mb-2 rounded-full bg-background/50 p-2 shadow-sm backdrop-blur-sm text-amber-600 dark:text-amber-400">
              <Clock className="size-5" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">
              Overtime (30d)
            </p>
            <p className="mt-1 font-semibold">+{totalOvertimeHours.toFixed(1)}h</p>
            <p className="text-[10px] opacity-80 mt-0.5">+৳{Math.round(estOvertimeEarned)} earned</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border bg-purple-50/50 p-4 text-center text-purple-600 dark:bg-purple-950/20 dark:text-purple-400">
            <div className="mb-2 rounded-full bg-background/50 p-2 shadow-sm backdrop-blur-sm text-purple-600 dark:text-purple-400">
              <CheckCircle2 className="size-5" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">
              Tasks (30d)
            </p>
            <p className="mt-1 font-semibold">
              {workReport.completedTasks.length}
            </p>
            <p className="text-[10px] opacity-80 mt-0.5">completed</p>
          </div>
        </div>

        {/* WORK REPORT */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight">
              Recent Tasks Completed
            </h3>
            <Badge variant="secondary" className="rounded-full px-3">
              {workReport.completedTasks.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {workReport.completedTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <FileText className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No tasks completed recently</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
                {workReport.completedTasks.map((t: any, i: number) => (
                  <div
                    key={i}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-card p-4 transition-all hover:bg-muted/30 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                        <CheckCircle2 className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm leading-tight text-foreground">
                          {t.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Order #{t.jobCardNumber}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.completedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ATTENDANCE */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight">
              Attendance & Overtime (Last 30 Days)
            </h3>
            <Badge variant="secondary" className="rounded-full px-3">
              {attendance.length} Records
            </Badge>
          </div>

          <div className="space-y-3">
            {attendance.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <CalendarCheck className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No attendance recorded</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="px-4 py-3 font-semibold rounded-l-lg">
                        Date
                      </th>
                      <th className="px-4 py-3 font-semibold">Check In</th>
                      <th className="px-4 py-3 font-semibold">Check Out</th>
                      <th className="px-4 py-3 font-semibold">Hours</th>
                      <th className="px-4 py-3 font-semibold">Overtime</th>
                      <th className="px-4 py-3 font-semibold rounded-r-lg">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {attendance.map((a: any) => {
                      const isAbsent = a.status === "absent";
                      const otHours = isAbsent ? 0 : Math.max(0, (a.hoursWorked || 0) - reqHours);
                      return (
                        <tr
                          key={a._id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium">
                            {new Date(a.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {a.checkIn
                              ? new Date(a.checkIn).toLocaleTimeString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {a.checkOut
                              ? new Date(a.checkOut).toLocaleTimeString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {isAbsent ? "0.0" : (a.hoursWorked || 0).toFixed(1)}
                          </td>
                          <td className="px-4 py-3">
                            {otHours > 0 ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px] font-semibold gap-1"
                              >
                                +{otHours.toFixed(1)}h OT
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                a.status === "present"
                                  ? "default"
                                  : a.status === "absent"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={cn(
                                "capitalize shadow-none",
                                a.status === "present"
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400"
                                  : a.status === "absent"
                                  ? "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-400"
                                  : a.status === "half_day"
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400"
                                  : ""
                              )}
                            >
                              {a.status?.replace("_", " ")}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN (SIDEBAR) ── */}
      <div className="space-y-6">
        {/* DASHBOARD ACCESS CARD */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="bg-muted/40 p-5 border-b flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Shield className="size-4 text-primary" />
              Dashboard Access
            </h3>
            {hasLogin ? (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 capitalize text-xs"
              >
                {employee.userId?.role}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs"
              >
                No Access
              </Badge>
            )}
          </div>
          <div className="p-5 space-y-4">
            {hasLogin ? (
              <>
                <div className="rounded-xl border bg-muted/20 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Login Role:</span>
                    <span className="font-semibold capitalize text-foreground">
                      {employee.userId?.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Login ID:</span>
                    <span className="font-mono text-foreground truncate max-w-[170px]">
                      {employee.userId?.email || employee.userId?.phone || employee.phone}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <UserCheck className="size-3" /> Active
                    </span>
                  </div>
                </div>

                <EditEmployeeDialog
                  employee={employee}
                  trigger={
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <KeyRound className="size-4" /> Manage Role / Password
                    </Button>
                  }
                />
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This employee does not have dashboard login credentials yet. You can create login access so they can log into the system.
                </p>

                <EditEmployeeDialog
                  employee={employee}
                  trigger={
                    <Button size="sm" className="w-full gap-2">
                      <PlusCircle className="size-4" /> Create Dashboard Login
                    </Button>
                  }
                />
              </>
            )}
          </div>
        </div>

        {/* PAYROLL MANAGEMENT CARD */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="bg-muted/40 p-5 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <LayoutDashboard className="size-4 text-primary" />
              Payroll Management
            </h3>
          </div>
          <div className="p-0">
            <SalaryHistory employeeId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
