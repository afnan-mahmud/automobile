"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { positiveNegativeVariant } from "@/lib/statusBadge";
import { AddEmployeeDialog } from "./add-employee-dialog";

type EmployeeRow = {
  _id: string;
  name: string;
  phone: string;
  designation?: string;
  hourlyRate: number;
  active: boolean;
};

export function EmployeeList({ initialEmployees }: { initialEmployees: EmployeeRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddEmployeeDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Hourly Rate</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialEmployees.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No employees yet.
              </TableCell>
            </TableRow>
          )}
          {initialEmployees.map((emp) => (
            <TableRow key={emp._id}>
              <TableCell>
                <Link href={`/employees/${emp._id}`} className="font-medium hover:underline">
                  {emp.name}
                </Link>
              </TableCell>
              <TableCell>{emp.phone}</TableCell>
              <TableCell>{emp.designation || "—"}</TableCell>
              <TableCell>৳{emp.hourlyRate}</TableCell>
              <TableCell>
                <Badge variant={emp.active ? positiveNegativeVariant(true) : "outline"}>
                  {emp.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
