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
import { Badge } from "@/components/ui/badge";
import { updateEmployee } from "@/actions/employees";
import { FormField, FormError, fieldInputClass, fieldSelectClass } from "@/components/ui/form-field";
import { User, Phone, Briefcase, Mail, Edit, Shield, Lock, DollarSign, Clock, KeyRound } from "lucide-react";
import { DEPARTMENTS } from "@/types/department";

export interface EmployeeWithUser {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  designation?: string;
  departments?: string[];
  salaryType?: "daily" | "monthly";
  salaryAmount?: number;
  hourlyRate?: number;
  overtimeHourlyRate?: number;
  requiredHoursPerDay?: number;
  userId?: {
    _id?: string;
    email?: string;
    phone?: string;
    role?: "admin" | "manager" | "technician";
    active?: boolean;
  } | null;
}

function getInitialSalaryAmount(emp: EmployeeWithUser, type: "daily" | "monthly") {
  if (emp.salaryAmount !== undefined && emp.salaryAmount > 0) {
    return String(emp.salaryAmount);
  }
  if (emp.hourlyRate && emp.hourlyRate > 0) {
    const hours = emp.requiredHoursPerDay || 8;
    return type === "daily"
      ? String(Math.round(emp.hourlyRate * hours))
      : String(Math.round(emp.hourlyRate * 30 * hours));
  }
  return "";
}

export function EditEmployeeDialog({
  employee,
  isAdmin = true,
  trigger,
}: {
  employee: EmployeeWithUser;
  isAdmin?: boolean;
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(employee.name);
  const [phone, setPhone] = useState(employee.phone);
  const [email, setEmail] = useState(employee.email || "");
  const [designation, setDesignation] = useState(employee.designation || "");
  const [departments, setDepartments] = useState<string[]>(employee.departments || []);
  const [salaryType, setSalaryType] = useState<"daily" | "monthly">(
    employee.salaryType || "monthly"
  );
  const [salaryAmount, setSalaryAmount] = useState(
    getInitialSalaryAmount(employee, employee.salaryType || "monthly")
  );
  const [requiredHoursPerDay, setRequiredHoursPerDay] = useState(
    employee.requiredHoursPerDay ? String(employee.requiredHoursPerDay) : "8"
  );
  const [overtimeHourlyRate, setOvertimeHourlyRate] = useState(
    employee.overtimeHourlyRate ? String(employee.overtimeHourlyRate) : ""
  );

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

  // Login management
  const hasExistingUser = Boolean(employee.userId);
  const [createLogin, setCreateLogin] = useState(false);
  const [loginRole, setLoginRole] = useState<"manager" | "technician">(
    (employee.userId?.role as "manager" | "technician") || "technician"
  );
  const [loginIdentifier, setLoginIdentifier] = useState(
    employee.userId?.email || employee.userId?.phone || employee.email || employee.phone || ""
  );
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      const initialType = employee.salaryType || "monthly";
      setName(employee.name);
      setPhone(employee.phone);
      setEmail(employee.email || "");
      setDesignation(employee.designation || "");
      setDepartments(employee.departments || []);
      setSalaryType(initialType);
      setSalaryAmount(getInitialSalaryAmount(employee, initialType));
      setRequiredHoursPerDay(
        employee.requiredHoursPerDay ? String(employee.requiredHoursPerDay) : "8"
      );
      setOvertimeHourlyRate(
        employee.overtimeHourlyRate ? String(employee.overtimeHourlyRate) : ""
      );
      setCreateLogin(false);
      setLoginRole((employee.userId?.role as "manager" | "technician") || "technician");
      setLoginIdentifier(
        employee.userId?.email || employee.userId?.phone || employee.email || employee.phone || ""
      );
      setLoginPassword("");
      setError(null);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required");
      return;
    }

    if (isAdmin && (!salaryAmount || Number(salaryAmount) <= 0)) {
      setError(
        `Valid ${salaryType === "daily" ? "daily amount" : "monthly salary"} is required`
      );
      return;
    }

    if (!hasExistingUser && createLogin) {
      if (!loginIdentifier.trim()) {
        setError("Login email or phone is required");
        return;
      }
      if (!loginPassword || loginPassword.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
    }

    if (hasExistingUser && loginPassword && loginPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    const result = await updateEmployee({
      id: employee._id,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      designation: designation.trim() || undefined,
      departments: departments.length > 0 ? (departments as any) : undefined,
      salaryType: isAdmin ? salaryType : undefined,
      salaryAmount: isAdmin ? Number(salaryAmount) : undefined,
      hourlyRate: isAdmin ? computedHourlyRate : undefined,
      overtimeHourlyRate:
        isAdmin && overtimeHourlyRate ? Number(overtimeHourlyRate) : undefined,
      requiredHoursPerDay:
        isAdmin && requiredHoursPerDay ? Number(requiredHoursPerDay) : undefined,
      createLogin: !hasExistingUser ? createLogin : undefined,
      loginRole,
      loginIdentifier: !hasExistingUser && createLogin ? loginIdentifier.trim() : undefined,
      loginPassword: loginPassword ? loginPassword : undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    if (result.data?.loginError) {
      setError(`Profile updated, but login issue: ${result.data.loginError}`);
      router.refresh();
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger || (
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="size-4" /> Edit Profile
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <FormField label="Full Name" htmlFor="edit-emp-name">
            <div className="flex items-center gap-2 px-3">
              <User className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="edit-emp-name"
                placeholder="e.g. Rahim Uddin"
                className={fieldInputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Phone" htmlFor="edit-emp-phone">
              <div className="flex items-center gap-2 px-3">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="edit-emp-phone"
                  placeholder="01XXXXXXXXX"
                  className={fieldInputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </FormField>

            <FormField label="Email" htmlFor="edit-emp-email" optional>
              <div className="flex items-center gap-2 px-3">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="edit-emp-email"
                  type="email"
                  placeholder="e.g. rahim@example.com"
                  className={fieldInputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </FormField>
          </div>

          <FormField label="Designation" htmlFor="edit-emp-desig" optional>
            <div className="flex items-center gap-2 px-3">
              <Briefcase className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="edit-emp-desig"
                placeholder="e.g. Senior Technician"
                className={fieldInputClass}
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="Departments" htmlFor="edit-emp-dept" optional>
            <div className="flex flex-wrap gap-2 pt-1 px-1">
              {DEPARTMENTS.map((dept) => {
                const isSelected = departments.includes(dept);
                return (
                  <label
                    key={dept}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                        : "bg-background hover:bg-muted/50"
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

          {isAdmin ? (
            <div className="space-y-3 rounded-xl border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-primary" /> Salary & Working Hours
                </span>
                <div className="flex rounded-lg bg-muted p-0.5 border">
                  <button
                    type="button"
                    onClick={() => {
                      setSalaryType("daily");
                      if (salaryAmount && salaryType === "monthly") {
                        // Optionally convert or keep
                      }
                    }}
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
                    onClick={() => {
                      setSalaryType("monthly");
                    }}
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
                  htmlFor="edit-emp-salary-amount"
                >
                  <div className="flex items-center gap-2 px-3">
                    <DollarSign className="size-4 shrink-0 text-muted-foreground" />
                    <Input
                      id="edit-emp-salary-amount"
                      type="number"
                      placeholder={salaryType === "daily" ? "e.g. 800" : "e.g. 25000"}
                      className={fieldInputClass}
                      value={salaryAmount}
                      onChange={(e) => setSalaryAmount(e.target.value)}
                    />
                  </div>
                </FormField>
                <FormField label="Working Hrs/Day" htmlFor="edit-emp-hours">
                  <div className="flex items-center gap-2 px-3">
                    <Clock className="size-4 shrink-0 text-muted-foreground" />
                    <Input
                      id="edit-emp-hours"
                      type="number"
                      placeholder="8"
                      className={fieldInputClass}
                      value={requiredHoursPerDay}
                      onChange={(e) => setRequiredHoursPerDay(e.target.value)}
                    />
                  </div>
                </FormField>
              </div>

              <FormField label="Overtime Rate (৳/hr)" htmlFor="edit-emp-ot-rate" optional>
                <div className="flex items-center gap-2 px-3">
                  <DollarSign className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="edit-emp-ot-rate"
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
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/30 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Lock className="size-3.5 text-amber-500" />
                <span>Salary Settings (Admin Only)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Salary mode: <span className="font-medium text-foreground capitalize">{employee.salaryType || "Monthly"}</span> · Rate: <span className="font-medium text-foreground">৳{employee.hourlyRate || 0}/hr</span> (OT: <span className="font-medium text-foreground">৳{employee.overtimeHourlyRate || employee.hourlyRate || 0}/hr</span>, {employee.requiredHoursPerDay || 8} hrs/day)
              </p>
            </div>
          )}

          {/* DASHBOARD LOGIN SECTION */}
          <div className="pt-2">
            {!hasExistingUser ? (
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-muted/30 p-3.5 transition-colors hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={createLogin}
                    onChange={(e) => setCreateLogin(e.target.checked)}
                    className="size-4 rounded accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Shield className="size-4 text-primary" />
                      Create dashboard login
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Allow this employee to log into the dashboard
                    </p>
                  </div>
                </label>

                {createLogin && (
                  <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                      <Shield className="size-3.5" />
                      New Login Credentials
                    </div>

                    <FormField label="Role" htmlFor="edit-login-role">
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

                    <FormField label="Login ID (email or phone)" htmlFor="edit-login-id">
                      <div className="flex items-center gap-2 px-3">
                        <Mail className="size-4 shrink-0 text-muted-foreground" />
                        <Input
                          id="edit-login-id"
                          placeholder="email or phone"
                          className={fieldInputClass}
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                        />
                      </div>
                    </FormField>

                    <FormField label="Password" htmlFor="edit-login-password">
                      <div className="flex items-center gap-2 px-3">
                        <Lock className="size-4 shrink-0 text-muted-foreground" />
                        <Input
                          id="edit-login-password"
                          type="password"
                          placeholder="At least 6 characters"
                          className={fieldInputClass}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                        />
                      </div>
                    </FormField>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                    <Shield className="size-3.5 text-primary" />
                    Dashboard Login Account
                  </div>
                  <Badge variant="outline" className="capitalize bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    {employee.userId?.role || "Active"}
                  </Badge>
                </div>

                <FormField label="Login Role" htmlFor="edit-user-role">
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

                <FormField label="Change Password" htmlFor="edit-reset-password" optional>
                  <div className="flex items-center gap-2 px-3">
                    <KeyRound className="size-4 shrink-0 text-muted-foreground" />
                    <Input
                      id="edit-reset-password"
                      type="password"
                      placeholder="Leave blank to keep unchanged"
                      className={fieldInputClass}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                </FormField>
              </div>
            )}
          </div>

          <FormError message={error} />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
