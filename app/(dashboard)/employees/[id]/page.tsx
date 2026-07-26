import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePageRole } from "@/lib/auth";
import {
  getEmployeeById,
  getAttendanceByEmployee,
  getEmployeeWorkReport,
} from "@/actions/employees";
import { SalaryHistory } from "./salary-history";

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{employee.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Phone: {employee.phone}</p>
          {employee.designation && <p>Designation: {employee.designation}</p>}
          <p>Hourly Rate: ৳{employee.hourlyRate}</p>
          <p>Required Hours/Day: {employee.requiredHoursPerDay}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No attendance recorded.
                  </TableCell>
                </TableRow>
              )}
              {attendance.map((a: {
                _id: string;
                date: string;
                checkIn?: string;
                checkOut?: string;
                hoursWorked: number;
                status: string;
              }) => (
                <TableRow key={a._id}>
                  <TableCell>{new Date(a.date).toLocaleDateString()}</TableCell>
                  <TableCell>{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : "—"}</TableCell>
                  <TableCell>{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : "—"}</TableCell>
                  <TableCell>{a.hoursWorked.toFixed(1)}</TableCell>
                  <TableCell className="capitalize">{a.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Report (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Total hours worked: {workReport.totalHours.toFixed(1)}</p>
          <p>Tasks completed: {workReport.completedTasks.length}</p>
          <ul className="list-inside list-disc text-muted-foreground">
            {workReport.completedTasks.map(
              (t: { jobCardNumber: string; description: string; completedDate: Date }, i: number) => (
                <li key={i}>
                  {t.jobCardNumber}: {t.description} —{" "}
                  {new Date(t.completedDate).toLocaleDateString()}
                </li>
              )
            )}
          </ul>
        </CardContent>
      </Card>

      <SalaryHistory employeeId={id} />
    </div>
  );
}
