"use client";

import { useState } from "react";
import { MoreHorizontal, Edit, Trash, Settings2, Hash, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormField, FormError, fieldInputClass } from "@/components/ui/form-field";
import { updateService, deleteService } from "@/actions/services";
import { DEPARTMENTS } from "@/types/department";
import { type ServiceRow } from "./service-list";

export function ServiceActions({ service }: { service: ServiceRow }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: service.name,
    department: service.department,
    expectedCosting: service.expectedCosting.toString(),
  });

  function handleOpenEdit() {
    setFormData({
      name: service.name,
      department: service.department,
      expectedCosting: service.expectedCosting.toString(),
    });
    setError(null);
    setIsEditOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await updateService(service._id, {
      name: formData.name,
      department: formData.department,
      expectedCosting: parseFloat(formData.expectedCosting) || 0,
    });

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || "Failed to update service");
      return;
    }
    setIsEditOpen(false);
  }

  async function handleDelete() {
    setError(null);
    setIsSubmitting(true);
    const result = await deleteService(service._id);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || "Failed to delete service");
      return;
    }
    setIsDeleteOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 rounded-xl">
          <DropdownMenuItem onClick={handleOpenEdit} className="cursor-pointer gap-2 rounded-lg">
            <Edit className="h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="cursor-pointer gap-2 rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50">
            <Trash className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader className="mb-4">
              <DialogTitle>Edit Service</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <FormField label="Service Name" htmlFor={`edit-name-${service._id}`} icon={<Settings2 className="size-4" />}>
                <Input
                  id={`edit-name-${service._id}`}
                  required
                  placeholder="e.g. Engine Oil Change"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>

              <FormField label="Department" htmlFor={`edit-dept-${service._id}`} icon={<Hash className="size-4" />}>
                <Select
                  value={formData.department}
                  onValueChange={(val) => setFormData({ ...formData, department: val ?? "" })}
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

              <FormField label="Expected Costing" htmlFor={`edit-cost-${service._id}`} icon={<DollarSign className="size-4" />}>
                <Input
                  id={`edit-cost-${service._id}`}
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
              <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl px-6">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{service.name}</strong>? This action cannot be undone.
            </p>
            <div className="mt-4">
              <FormError message={error} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsDeleteOpen(false)} className="rounded-xl" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} className="rounded-xl px-6" disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
