"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEmployee } from "@/actions/employees";
import { FormField, FormError, fieldInputClass, fieldSelectClass } from "@/components/ui/form-field";
import { User, Phone, Briefcase, Clock, DollarSign, Lock, Mail, Shield, Hash } from "lucide-react";
import { DEPARTMENTS } from "@/types/department";

export function AddEmployeeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [salaryType, setSalaryType] = useState<"daily" | "monthly">("monthly");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [requiredHoursPerDay, setRequiredHoursPerDay] = useState("8");
  const [overtimeHourlyRate, setOvertimeHourlyRate] = useState("");
  const [createLogin, setCreateLogin] = useState(false);
  const [loginRole, setLoginRole] = useState<"manager" | "technician">("technician");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedAmount = parseFloat(salaryAmount) || 0;
  const parsedHours = parseFloat(requiredHoursPerDay) || 8;
  const computedHourlyRate =
    parsedAmount > 0 && parsedHours > 0
      ? salaryType === "daily"
        ? parsedAmount / parsedHours
        : parsedAmount / (30 * parsedHours)
      : 0;

  const computedDailyEquivalent =
    parsedAmount > 0
      ? salaryType === "daily"
        ? parsedAmount
        : parsedAmount / 30
      : 0;

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !phone.trim() || !salaryAmount) {
      setError(`Name, phone, and ${salaryType === "daily" ? "daily amount" : "monthly salary"} are required`);
      return;
    }
    setIsSubmitting(true);
    const result = await createEmployee({
      name,
      phone,
      designation: designation || undefined,
      departments: departments.length > 0 ? (departments as any) : undefined,
      salaryType,
      salaryAmount: Number(salaryAmount),
      hourlyRate: computedHourlyRate,
      overtimeHourlyRate: overtimeHourlyRate ? Number(overtimeHourlyRate) : undefined,
      requiredHoursPerDay: Number(requiredHoursPerDay) || 8,
      createLogin,
      loginRole: createLogin ? loginRole : undefined,
      loginIdentifier: createLogin ? loginIdentifier : undefined,
      loginPassword: createLogin ? loginPassword : undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    if (result.data.loginError) {
      setError(`Employee saved, but login failed: ${result.data.loginError}`);
      router.refresh();
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Add Employee</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <FormField label="Full Name" htmlFor="emp-name">
            <div className="flex items-center gap-2 px-3">
              <User className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="emp-name"
                placeholder="e.g. Rahim Uddin"
                className={fieldInputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="Phone" htmlFor="emp-phone">
            <div className="flex items-center gap-2 px-3">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="emp-phone"
                placeholder="01XXXXXXXXX"
                className={fieldInputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="Designation" htmlFor="emp-desig" optional>
            <div className="flex items-center gap-2 px-3">
              <Briefcase className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="emp-desig"
                placeholder="e.g. Senior Technician"
                className={fieldInputClass}
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="Departments" htmlFor="emp-dept" optional>
            <div className="flex flex-wrap gap-2 pt-1 px-1">
              {DEPARTMENTS.map((dept) => {
                const isSelected = departments.includes(dept);
                return (
                  <label
                    key={dept}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/10 border-primary/30 text-primary" : "bg-background hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDepartments([...departments, dept]);
                        } else {
                          setDepartments(departments.filter((d) => d !== dept));
                        }
                      }}
                    />
                    {dept}
                  </label>
                );
              })}
            </div>
          </FormField>

          <div className="space-y-3 rounded-xl border bg-muted/20 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-primary" /> Salary & Working Hours
              </span>
              <div className="flex rounded-lg bg-muted p-0.5 border">
                <button
                  type="button"
                  onClick={() => setSalaryType("daily")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    salaryType === "daily"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setSalaryType("monthly")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    salaryType === "monthly"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                label={salaryType === "daily" ? "Daily Amount (৳)" : "Monthly Salary (৳)"}
                htmlFor="emp-salary-amount"
              >
                <div className="flex items-center gap-2 px-3">
                  <DollarSign className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="emp-salary-amount"
                    type="number"
                    placeholder={salaryType === "daily" ? "e.g. 800" : "e.g. 25000"}
                    className={fieldInputClass}
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                  />
                </div>
              </FormField>
              <FormField label="Working Hrs/Day" htmlFor="emp-hours">
                <div className="flex items-center gap-2 px-3">
                  <Clock className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="emp-hours"
                    type="number"
                    placeholder="8"
                    className={fieldInputClass}
                    value={requiredHoursPerDay}
                    onChange={(e) => setRequiredHoursPerDay(e.target.value)}
                  />
                </div>
              </FormField>
            </div>

            <FormField label="Overtime Rate (৳/hr)" htmlFor="emp-ot-rate" optional>
              <div className="flex items-center gap-2 px-3">
                <DollarSign className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="emp-ot-rate"
                  type="number"
                  placeholder={computedHourlyRate > 0 ? `Default: ৳${computedHourlyRate.toFixed(2)}/hr` : "e.g. 150"}
                  className={fieldInputClass}
                  value={overtimeHourlyRate}
                  onChange={(e) => setOvertimeHourlyRate(e.target.value)}
                />
              </div>
            </FormField>

            {parsedAmount > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  {salaryType === "monthly"
                    ? `Daily Eq: ৳${computedDailyEquivalent.toFixed(2)}`
                    : `Daily: ৳${parsedAmount}`}
                </span>
                <span className="font-semibold text-primary">
                  Rate: ৳{computedHourlyRate.toFixed(2)}/hr · OT: ৳{(overtimeHourlyRate ? Number(overtimeHourlyRate) : computedHourlyRate).toFixed(2)}/hr
                </span>
              </div>
            )}
          </div>

          {/* Create login toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50">
            <input
              type="checkbox"
              checked={createLogin}
              onChange={(e) => setCreateLogin(e.target.checked)}
              className="size-4 rounded accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Create dashboard login</p>
              <p className="text-xs text-muted-foreground">Allow this employee to log into the system</p>
            </div>
          </label>

          {createLogin && (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <Shield className="size-3.5" />
                Login Credentials
              </div>

              <FormField label="Role" htmlFor="emp-role">
                <Select
                  value={loginRole}
                  onValueChange={(v) => v && setLoginRole(v as typeof loginRole)}
                >
                  <SelectTrigger className={`w-full ${fieldSelectClass} px-3`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Login ID (email or phone)" htmlFor="emp-login-id">
                <div className="flex items-center gap-2 px-3">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="emp-login-id"
                    placeholder="email or phone"
                    className={fieldInputClass}
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                  />
                </div>
              </FormField>

              <FormField label="Password" htmlFor="emp-password">
                <div className="flex items-center gap-2 px-3">
                  <Lock className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="emp-password"
                    type="password"
                    placeholder="••••••••"
                    className={fieldInputClass}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
              </FormField>
            </div>
          )}

          <FormError message={error} />

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Save Employee"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
