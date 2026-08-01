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
import { updateEmployee } from "@/actions/employees";
import { FormField, FormError, fieldInputClass } from "@/components/ui/form-field";
import { User, Phone, Briefcase, Mail, Edit } from "lucide-react";
import { DEPARTMENTS } from "@/types/department";

export function EditEmployeeDialog({
  employee,
}: {
  employee: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    designation?: string;
    departments?: string[];
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(employee.name);
  const [phone, setPhone] = useState(employee.phone);
  const [email, setEmail] = useState(employee.email || "");
  const [designation, setDesignation] = useState(employee.designation || "");
  const [departments, setDepartments] = useState<string[]>(employee.departments || []);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required");
      return;
    }
    setIsSubmitting(true);
    const result = await updateEmployee({
      id: employee._id,
      name,
      phone,
      email: email.trim() || undefined,
      designation: designation || undefined,
      departments: departments.length > 0 ? (departments as any) : undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2">
            <Edit className="size-4" /> Edit Profile
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
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

          <FormError message={error} />

          <div className="flex justify-end pt-4">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
