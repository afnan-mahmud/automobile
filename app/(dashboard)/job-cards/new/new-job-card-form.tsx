"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchCustomers, getCustomerWithVehicles } from "@/actions/customers";
import { createJobCard } from "@/actions/jobCards";

type Employee = { _id: string; name: string; designation?: string };
type CustomerRow = { _id: string; name: string; phone: string };
type VehicleRow = {
  _id: string;
  registrationNumber: string;
  make?: string;
  model?: string;
};

type TaskRow = { description: string; assignedTo: string; assignedDate: string };

const today = () => new Date().toISOString().slice(0, 10);

export function NewJobCardForm({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [tasks, setTasks] = useState<TaskRow[]>([
    { description: "", assignedTo: "", assignedDate: today() },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedCustomer) return;
    const handle = setTimeout(async () => {
      const results = await searchCustomers(customerQuery);
      setCustomers(results as CustomerRow[]);
    }, 300);
    return () => clearTimeout(handle);
  }, [customerQuery, selectedCustomer]);

  async function selectCustomer(customer: CustomerRow) {
    setSelectedCustomer(customer);
    setCustomers([]);
    const result = await getCustomerWithVehicles(customer._id);
    setVehicles((result?.vehicles as VehicleRow[]) ?? []);
  }

  function updateTask(index: number, patch: Partial<TaskRow>) {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t))
    );
  }

  function addTaskRow() {
    setTasks((prev) => [
      ...prev,
      { description: "", assignedTo: "", assignedDate: today() },
    ]);
  }

  function removeTaskRow(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError(null);
    if (!vehicleId) {
      setError("Select a vehicle first");
      return;
    }
    const cleanTasks = tasks
      .filter((t) => t.description.trim() && t.assignedTo)
      .map((t) => ({
        description: t.description,
        assignedTo: t.assignedTo,
        assignedDate: new Date(t.assignedDate),
      }));
    setIsSubmitting(true);
    const result = await createJobCard({ vehicleId, tasks: cleanTasks });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/job-cards/${result.data.id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vehicle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedCustomer ? (
            <div className="space-y-2">
              <Label>Search customer by name or phone</Label>
              <Input
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="e.g. Karim or 017..."
              />
              {customers.length > 0 && (
                <div className="rounded-md border">
                  {customers.map((c) => (
                    <button
                      type="button"
                      key={c._id}
                      onClick={() => selectCustomer(c)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span>{c.name}</span>
                      <span className="text-muted-foreground">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>
                  Customer: <span className="font-medium">{selectedCustomer.name}</span>{" "}
                  ({selectedCustomer.phone})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setVehicles([]);
                    setVehicleId("");
                  }}
                >
                  Change
                </Button>
              </div>

              {vehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This customer has no vehicles on file yet.
                </p>
              ) : (
                <Select value={vehicleId} onValueChange={(v) => setVehicleId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v._id} value={v._id}>
                        {v.registrationNumber} {v.make ? `— ${v.make} ${v.model ?? ""}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Initial Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={task.description}
                      onChange={(e) =>
                        updateTask(index, { description: e.target.value })
                      }
                      placeholder="e.g. Change engine oil"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.assignedTo}
                      onValueChange={(v) => updateTask(index, { assignedTo: v ?? "" })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Technician" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp._id} value={emp._id}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={task.assignedDate}
                      onChange={(e) =>
                        updateTask(index, { assignedDate: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTaskRow(index)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button type="button" variant="outline" size="sm" onClick={addTaskRow}>
            Add Task
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Job Card"}
      </Button>
    </div>
  );
}
