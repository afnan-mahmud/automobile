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

type Employee = { _id: string; name: string; departments?: string[] };
type Service = { _id: string; name: string; department: string };

const today = () => new Date().toISOString().slice(0, 10);

export function AssignTaskDialog({
  jobCardId,
  employees,
  services,
}: {
  jobCardId: string;
  employees: Employee[];
  services: Service[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [priority, setPriority] = useState("1");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedDate, setAssignedDate] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!serviceId || !assignedTo) {
      setError("Service and assignee are required");
      return;
    }
    setIsSubmitting(true);
    const result = await addTask({
      jobCardId,
      serviceId,
      description: description || undefined,
      assignedTo,
      assignedDate: new Date(assignedDate),
      priority: parseInt(priority) || 1,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "An error occurred");
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
          <div className="space-y-4 pt-2">
            <FormField label="Service" htmlFor="task-service">
              <div className="flex items-center gap-2 px-3">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <Select value={serviceId} onValueChange={(v) => { setServiceId(v ?? ""); setAssignedTo(""); }}>
                  <SelectTrigger className={fieldSelectClass}>
                    <SelectValue placeholder="Select Service">
                      {(value: string) => services.find((s) => s._id === value)?.name || "Select Service"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((srv) => (
                      <SelectItem key={srv._id} value={srv._id}>
                        {srv.name} <span className="text-muted-foreground ml-1">({srv.department})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormField>

            <FormField label="Optional Custom Notes" htmlFor="task-desc" optional>
              <div className="flex items-center gap-2 px-3">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="task-desc"
                  placeholder="e.g. Extra focus on left wheel"
                  className={fieldInputClass}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </FormField>

            {(() => {
              const selectedService = services.find((s) => s._id === serviceId);
              const assignableEmployees = selectedService
                ? employees.filter((emp) => emp.departments?.includes(selectedService.department))
                : employees;

              return (
                <FormField label="Assign To" htmlFor="task-assignee">
                  <div className="flex items-center gap-2 px-3">
                    <User className="size-4 shrink-0 text-muted-foreground" />
                    <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v ?? "")} disabled={!serviceId}>
                      <SelectTrigger className={fieldSelectClass}>
                        <SelectValue placeholder="Select Technician">
                          {(value: string) => employees.find((e) => e._id === value)?.name || "Select Technician"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {assignableEmployees.map((emp) => (
                          <SelectItem key={emp._id} value={emp._id}>
                            {emp.name}
                          </SelectItem>
                        ))}
                        {assignableEmployees.length === 0 && (
                          <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                            No employees in {selectedService?.department}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </FormField>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Assign Date" htmlFor="task-date">
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

              <FormField label="Priority / Step" htmlFor="task-priority">
                <div className="flex items-center gap-2 px-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="task-priority"
                    type="number"
                    min="1"
                    className={fieldInputClass}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  />
                </div>
              </FormField>
            </div>

          <FormError message={error} />

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Save Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
