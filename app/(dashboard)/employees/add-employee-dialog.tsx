"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Designation</Label>
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Hourly Rate</Label>
              <Input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Required Hrs/Day</Label>
              <Input
                type="number"
                value={requiredHoursPerDay}
                onChange={(e) => setRequiredHoursPerDay(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createLogin}
              onChange={(e) => setCreateLogin(e.target.checked)}
            />
            Create a login for this employee
          </label>

          {createLogin && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-1">
                <Label>Role</Label>
                <Select
                  value={loginRole}
                  onValueChange={(v) => v && setLoginRole(v as typeof loginRole)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Email or Phone (login id)</Label>
                <Input
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Save Employee"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
