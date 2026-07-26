"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSalaryRecord } from "@/actions/salary";

type SalaryRecord = {
  totalHoursWorked: number;
  requiredHours: number;
  deduction: number;
  overtimeAmount: number;
  netSalary: number;
};

const now = new Date();

export function SalaryHistory({ employeeId }: { employeeId: string }) {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [record, setRecord] = useState<SalaryRecord | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleLookup() {
    const result = await getSalaryRecord(employeeId, month, year);
    setRecord(result as SalaryRecord | null);
    setSearched(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Button size="sm" onClick={handleLookup}>
            View
          </Button>
        </div>

        {searched && !record && (
          <p className="text-sm text-muted-foreground">
            No salary record generated for this month yet.
          </p>
        )}
        {record && (
          <div className="space-y-1 text-sm">
            <p>Hours worked: {record.totalHoursWorked.toFixed(1)}</p>
            <p>Required hours: {record.requiredHours.toFixed(1)}</p>
            <p>Deduction: ৳{record.deduction.toFixed(2)}</p>
            <p>Overtime: ৳{record.overtimeAmount.toFixed(2)}</p>
            <p className="font-semibold">Net Salary: ৳{record.netSalary.toFixed(2)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
