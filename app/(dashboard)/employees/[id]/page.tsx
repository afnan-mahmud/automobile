import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requirePageRole } from "@/lib/auth";
import {
  getEmployeeById,
  getAttendanceByEmployee,
  getEmployeeWorkReport,
} from "@/actions/employees";
import { SalaryHistory } from "./salary-history";
import { User, Phone, Briefcase, Clock, CalendarCheck, FileText, LayoutDashboard, CheckCircle2 } from "lucide-react";
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

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
      
      {/* ── MAIN COLUMN ── */}
      <div className="space-y-6">
        
        {/* HERO BOX */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <User className="size-5" />
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Employee Profile
                  </p>
                  <EditEmployeeDialog employee={employee} />
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {employee.name}
              </h1>
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
                  {employee.departments?.length ? employee.departments.join(", ") : "No Department"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-4 text-center overflow-hidden">
            <div className="mb-2 rounded-full bg-muted p-2 shadow-sm text-muted-foreground">
              <Phone className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Contact</p>
            <p className="mt-1 font-semibold text-sm">{employee.phone}</p>
            {employee.email && <p className="text-[10px] text-muted-foreground truncate w-full mt-0.5">{employee.email}</p>}
          </div>
          
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-4 text-center">
            <div className="mb-2 rounded-full bg-muted p-2 shadow-sm text-muted-foreground">
              <Clock className="size-5" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">Rate & Hrs</p>
            <p className="mt-1 font-semibold text-sm">৳{employee.hourlyRate} / {employee.requiredHoursPerDay}h</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border bg-emerald-50/50 p-4 text-center text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
            <div className="mb-2 rounded-full bg-background/50 p-2 shadow-sm backdrop-blur-sm text-emerald-600 dark:text-emerald-400">
              <CalendarCheck className="size-5" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">Hours (30d)</p>
            <p className="mt-1 font-semibold">{workReport.totalHours.toFixed(1)}</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border bg-purple-50/50 p-4 text-center text-purple-600 dark:bg-purple-950/20 dark:text-purple-400">
            <div className="mb-2 rounded-full bg-background/50 p-2 shadow-sm backdrop-blur-sm text-purple-600 dark:text-purple-400">
              <CheckCircle2 className="size-5" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">Tasks (30d)</p>
            <p className="mt-1 font-semibold">{workReport.completedTasks.length}</p>
          </div>
        </div>

        {/* WORK REPORT */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight">Recent Tasks Completed</h3>
            <Badge variant="secondary" className="rounded-full px-3">{workReport.completedTasks.length}</Badge>
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
                  <div key={i} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-card p-4 transition-all hover:bg-muted/30 hover:shadow-sm">
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
                      <p className="text-xs text-muted-foreground">{new Date(t.completedDate).toLocaleDateString()}</p>
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
            <h3 className="text-lg font-semibold tracking-tight">Attendance (Last 30 Days)</h3>
            <Badge variant="secondary" className="rounded-full px-3">{attendance.length} Records</Badge>
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
                      <th className="px-4 py-3 font-semibold rounded-l-lg">Date</th>
                      <th className="px-4 py-3 font-semibold">Check In</th>
                      <th className="px-4 py-3 font-semibold">Check Out</th>
                      <th className="px-4 py-3 font-semibold">Hours</th>
                      <th className="px-4 py-3 font-semibold rounded-r-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {attendance.map((a: any) => (
                      <tr key={a._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-muted-foreground">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : "—"}</td>
                        <td className="px-4 py-3 font-mono">{a.hoursWorked.toFixed(1)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={a.status === 'present' ? 'default' : 'secondary'} className={cn(
                            "capitalize shadow-none",
                            a.status === 'present' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400" : ""
                          )}>
                            {a.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN (SIDEBAR) ── */}
      <div className="space-y-6">
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
