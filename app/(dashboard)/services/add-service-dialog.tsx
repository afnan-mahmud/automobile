"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, FormError, fieldInputClass } from "@/components/ui/form-field";
import { createService } from "@/actions/services";
import { Plus, Settings2, Hash, DollarSign } from "lucide-react";
import { DEPARTMENTS } from "@/types/department";

export function AddServiceDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{ name: string; department: string; expectedCosting: string }>({
    name: "",
    department: DEPARTMENTS[0],
    expectedCosting: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await createService({
      name: formData.name,
      department: formData.department,
      expectedCosting: parseFloat(formData.expectedCosting) || 0,
    });

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || "Failed to create service");
      return;
    }

    setOpen(false);
    setFormData({ name: "", department: DEPARTMENTS[0], expectedCosting: "" });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="rounded-full shadow-sm hover:shadow-md transition-all">
          <Plus className="mr-2 size-4" />
          Add Service
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4">
            <DialogTitle>Add New Service</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <FormField label="Service Name" htmlFor="s-name" icon={<Settings2 className="size-4" />}>
              <Input
                id="s-name"
                required
                placeholder="e.g. Engine Oil Change"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={fieldInputClass}
              />
            </FormField>

            <FormField label="Department" htmlFor="s-dept" icon={<Hash className="size-4" />}>
              <Select
                value={formData.department}
                onValueChange={(val) => setFormData({ ...formData, department: val as typeof DEPARTMENTS[number] })}
              >
                <SelectTrigger className={fieldInputClass}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Expected Costing" htmlFor="s-cost" icon={<DollarSign className="size-4" />}>
              <Input
                id="s-cost"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="e.g. 500"
                value={formData.expectedCosting}
                onChange={(e) => setFormData({ ...formData, expectedCosting: e.target.value })}
                className={fieldInputClass}
              />
            </FormField>

            <FormError message={error} />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl px-6">
              {isSubmitting ? "Saving..." : "Add Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
