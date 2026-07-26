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
import { addTask } from "@/actions/jobCards";
import { FormField, FormError, fieldInputClass, fieldSelectClass } from "@/components/ui/form-field";
import { FileText, User, Calendar } from "lucide-react";

type Employee = { _id: string; name: string };

const today = () => new Date().toISOString().slice(0, 10);

export function AssignTaskDialog({
  jobCardId,
  employees,
}: {
  jobCardId: string;
  employees: Employee[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedDate, setAssignedDate] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!description.trim() || !assignedTo) {
      setError("Description and assignee are required");
      return;
    }
    setIsSubmitting(true);
    const result = await addTask({
      jobCardId,
      description,
      assignedTo,
      assignedDate: new Date(assignedDate),
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setDescription("");
    setAssignedTo("");
    setAssignedDate(today());
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Assign Task</Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <FormField label="Description" htmlFor="task-description">
            <div className="flex items-center gap-2 px-3">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="task-description"
                placeholder="e.g. Change engine oil"
                className={fieldInputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="Assign To">
            <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v ?? "")}>
              <SelectTrigger className={`w-full ${fieldSelectClass} px-3`}>
                <div className="flex items-center gap-2">
                  <User className="size-4 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="Select technician" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp._id} value={emp._id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Date" htmlFor="task-date">
            <div className="flex items-center gap-2 px-3">
              <Calendar className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="task-date"
                type="date"
                className={fieldInputClass}
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
              />
            </div>
          </FormField>

          <FormError message={error} />

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Save Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
