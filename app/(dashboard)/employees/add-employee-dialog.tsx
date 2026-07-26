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
import { User, Phone, Briefcase, Clock, DollarSign, Lock, Mail, Shield } from "lucide-react";

export function AddEmployeeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [requiredHoursPerDay, setRequiredHoursPerDay] = useState("8");
  const [createLogin, setCreateLogin] = useState(false);
  const [loginRole, setLoginRole] = useState<"manager" | "technician">("technician");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !phone.trim() || !hourlyRate) {
      setError("Name, phone, and hourly rate are required");
      return;
    }
    setIsSubmitting(true);
    const result = await createEmployee({
      name,
      phone,
      designation: designation || undefined,
      hourlyRate: Number(hourlyRate),
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

          <FormField label="Designation" htmlFor="emp-designation" optional>
            <div className="flex items-center gap-2 px-3">
              <Briefcase className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="emp-designation"
                placeholder="e.g. Senior Technician"
                className={fieldInputClass}
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Hourly Rate (৳)" htmlFor="emp-rate">
              <div className="flex items-center gap-2 px-3">
                <DollarSign className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="emp-rate"
                  type="number"
                  placeholder="0"
                  className={fieldInputClass}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>
            </FormField>
            <FormField label="Required Hrs/Day" htmlFor="emp-hours">
              <div className="flex items-center gap-2 px-3">
                <Clock className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="emp-hours"
                  type="number"
                  className={fieldInputClass}
                  value={requiredHoursPerDay}
                  onChange={(e) => setRequiredHoursPerDay(e.target.value)}
                />
              </div>
            </FormField>
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
