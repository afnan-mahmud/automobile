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
import { generateSalaryForAllEmployees, listSalaryRecords } from "@/actions/salary";

type SalaryRow = {
  _id: string;
  employeeId: { name: string; designation?: string } | null;
  totalHoursWorked: number;
  requiredHours: number;
  deduction: number;
  overtimeAmount: number;
  netSalary: number;
};

const now = new Date();

export function SalaryPanel() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<SalaryRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const results = await listSalaryRecords(month, year);
    setRecords(results as SalaryRow[]);
  }

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);
    const result = await generateSalaryForAllEmployees({ month, year });
    setIsGenerating(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Month</label>
          <Input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-20"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Year</label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24"
          />
        </div>
        <Button size="sm" variant="outline" onClick={refresh}>
          View
        </Button>
        <Button size="sm" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate Salary for All"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Hours Worked</TableHead>
            <TableHead>Required Hours</TableHead>
            <TableHead>Deduction</TableHead>
            <TableHead>Overtime</TableHead>
            <TableHead>Net Salary</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No salary records for this period yet.
              </TableCell>
            </TableRow>
          )}
          {records.map((r) => (
            <TableRow key={r._id}>
              <TableCell>{r.employeeId?.name ?? "—"}</TableCell>
              <TableCell>{r.totalHoursWorked.toFixed(1)}</TableCell>
              <TableCell>{r.requiredHours.toFixed(1)}</TableCell>
              <TableCell>৳{r.deduction.toFixed(2)}</TableCell>
              <TableCell>৳{r.overtimeAmount.toFixed(2)}</TableCell>
              <TableCell className="font-medium">৳{r.netSalary.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
