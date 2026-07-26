"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/types/attendance";
import { markAttendance } from "@/actions/employees";

type Employee = { _id: string; name: string; designation?: string };

type RowState = { checkIn: string; checkOut: string; status: AttendanceStatus; saved: boolean; error?: string };

const today = () => new Date().toISOString().slice(0, 10);

export function AttendanceGrid({ employees }: { employees: Employee[] }) {
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<Record<string, RowState>>(
    Object.fromEntries(
      employees.map((e) => [e._id, { checkIn: "", checkOut: "", status: "present" as AttendanceStatus, saved: false }])
    )
  );

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch, saved: false } }));
  }

  async function handleSave(id: string) {
    const row = rows[id];
    const result = await markAttendance({
      employeeId: id,
      date: new Date(date),
      checkIn: row.checkIn ? new Date(`${date}T${row.checkIn}`) : undefined,
      checkOut: row.checkOut ? new Date(`${date}T${row.checkOut}`) : undefined,
      status: row.status,
    });
    if (!result.success) {
      updateRow(id, { error: result.error });
      return;
    }
    updateRow(id, { saved: true, error: undefined });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm text-muted-foreground">Date</label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Check In</TableHead>
            <TableHead>Check Out</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => {
            const row = rows[emp._id];
            return (
              <TableRow key={emp._id}>
                <TableCell>{emp.name}</TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={row.checkIn}
                    onChange={(e) => updateRow(emp._id, { checkIn: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={row.checkOut}
                    onChange={(e) => updateRow(emp._id, { checkOut: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={row.status}
                    onValueChange={(v) => v && updateRow(emp._id, { status: v as AttendanceStatus })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTENDANCE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => handleSave(emp._id)}>
                    Save
                  </Button>
                  {row.saved && <span className="ml-2 text-xs text-muted-foreground">Saved</span>}
                  {row.error && <p className="text-xs text-destructive">{row.error}</p>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
