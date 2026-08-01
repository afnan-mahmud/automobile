"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSalaryRecord } from "@/actions/salary";
import { Search, Info } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);

  async function handleLookup() {
    setIsLoading(true);
    const result = await getSalaryRecord(employeeId, month, year);
    setRecord(result as SalaryRecord | null);
    setSearched(true);
    setIsLoading(false);
  }

  return (
    <div className="p-5 flex flex-col space-y-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-3">
          <div className="space-y-1.5 flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Month</label>
            <Input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-xl h-11"
            />
          </div>
          <div className="space-y-1.5 flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Year</label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-xl h-11"
            />
          </div>
        </div>
        <Button onClick={handleLookup} disabled={isLoading} className="w-full rounded-xl h-11">
          {isLoading ? "Searching..." : <><Search className="mr-2 size-4" /> View Salary Record</>}
        </Button>
      </div>

      {searched && !record && (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <Info className="mx-auto mb-2 size-6 text-muted-foreground/50" />
          <p className="text-sm font-medium">No record generated for {month}/{year}</p>
        </div>
      )}
      
      {record && (
        <div className="rounded-xl bg-muted/40 p-4 border space-y-3">
          <div className="flex justify-between items-center text-sm border-b pb-2">
            <span className="text-muted-foreground">Hours Worked</span>
            <span className="font-medium">{record.totalHoursWorked.toFixed(1)} / {record.requiredHours.toFixed(1)}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b pb-2">
            <span className="text-muted-foreground">Deduction</span>
            <span className="font-medium text-pink-600 dark:text-pink-400">-৳{record.deduction.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b pb-2">
            <span className="text-muted-foreground">Overtime</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">+৳{record.overtimeAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="font-semibold text-foreground">Net Salary</span>
            <span className="font-bold text-lg text-primary">৳{record.netSalary.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
