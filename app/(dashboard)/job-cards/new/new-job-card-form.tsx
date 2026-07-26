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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { searchCustomers, getCustomerWithVehicles, createCustomer } from "@/actions/customers";
import { createVehicle } from "@/actions/vehicles";
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

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });
  const [newVehicle, setNewVehicle] = useState({ registrationNumber: "", make: "", model: "", year: "", color: "" });
  const [modalError, setModalError] = useState<string | null>(null);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  useEffect(() => {
    if (selectedCustomer) return;
    const handle = setTimeout(async () => {
      if (customerQuery.trim() === "") {
        setCustomers([]);
        return;
      }
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

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    setModalError(null);
    setIsModalSubmitting(true);
    const phoneToUse = newCustomer.phone || customerQuery;
    const result = await createCustomer({ ...newCustomer, phone: phoneToUse });
    setIsModalSubmitting(false);
    
    if (!result.success) {
      setModalError(result.error);
      return;
    }
    
    // Success
    setIsCustomerModalOpen(false);
    const created = { _id: result.data.id, name: newCustomer.name, phone: phoneToUse };
    setSelectedCustomer(created);
    setVehicles([]); // fresh customer has no vehicles
    
    // Automatically open vehicle modal
    setIsVehicleModalOpen(true);
    setNewVehicle({ registrationNumber: "", make: "", model: "", year: "", color: "" });
  }

  async function handleCreateVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;
    setModalError(null);
    setIsModalSubmitting(true);
    const result = await createVehicle({ 
      ...newVehicle, 
      year: newVehicle.year ? parseInt(newVehicle.year, 10) : undefined,
      customerId: selectedCustomer._id 
    });
    setIsModalSubmitting(false);
    
    if (!result.success) {
      setModalError(result.error);
      return;
    }
    
    // Success
    setIsVehicleModalOpen(false);
    const created = { 
      _id: result.data.id, 
      registrationNumber: newVehicle.registrationNumber, 
      make: newVehicle.make, 
      model: newVehicle.model 
    };
    setVehicles([created]);
    setVehicleId(created._id);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer & Vehicle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedCustomer ? (
            <div className="space-y-2">
              <Label>Search customer by name or phone</Label>
              <div className="flex gap-2">
                <Input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="e.g. Karim or 017..."
                />
                {customerQuery && customers.length === 0 && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setNewCustomer({ name: "", phone: customerQuery, email: "" });
                      setIsCustomerModalOpen(true);
                    }}
                  >
                    Create Customer
                  </Button>
                )}
              </div>
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
                    setCustomerQuery("");
                  }}
                >
                  Change
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {vehicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground flex-1">
                    This customer has no vehicles on file yet.
                  </p>
                ) : (
                  <Select value={vehicleId} onValueChange={(v) => setVehicleId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a vehicle">
                        {vehicles.find(v => v._id === vehicleId)
                          ? `${vehicles.find(v => v._id === vehicleId)!.registrationNumber} ${vehicles.find(v => v._id === vehicleId)!.make ? `— ${vehicles.find(v => v._id === vehicleId)!.make} ${vehicles.find(v => v._id === vehicleId)!.model ?? ""}` : ""}`.trim()
                          : "Select a vehicle"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v._id} value={v._id}>
                          {`${v.registrationNumber} ${v.make ? `— ${v.make} ${v.model ?? ""}` : ""}`.trim()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setNewVehicle({ registrationNumber: "", make: "", model: "", year: "", color: "" });
                    setIsVehicleModalOpen(true);
                  }}
                >
                  Add Vehicle
                </Button>
              </div>
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
                        <SelectValue placeholder="Technician">
                          {employees.find(emp => emp._id === task.assignedTo)?.name || "Technician"}
                        </SelectValue>
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
        {isSubmitting ? "Creating..." : "Create new order"}
      </Button>

      {/* Customer Modal */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={newCustomer.name} 
                onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={newCustomer.phone} 
                onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={newCustomer.email} 
                onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))} 
              />
            </div>
            {modalError && <p className="text-sm text-destructive">{modalError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCustomerModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isModalSubmitting}>
                {isModalSubmitting ? "Saving..." : "Done"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vehicle Modal */}
      <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateVehicle} className="space-y-4">
            <div className="space-y-2">
              <Label>Registration Number</Label>
              <Input 
                value={newVehicle.registrationNumber} 
                onChange={e => setNewVehicle(prev => ({ ...prev, registrationNumber: e.target.value }))} 
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Make</Label>
                <Input 
                  value={newVehicle.make} 
                  onChange={e => setNewVehicle(prev => ({ ...prev, make: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input 
                  value={newVehicle.model} 
                  onChange={e => setNewVehicle(prev => ({ ...prev, model: e.target.value }))} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input 
                  type="number"
                  value={newVehicle.year} 
                  onChange={e => setNewVehicle(prev => ({ ...prev, year: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input 
                  value={newVehicle.color} 
                  onChange={e => setNewVehicle(prev => ({ ...prev, color: e.target.value }))} 
                />
              </div>
            </div>
            {modalError && <p className="text-sm text-destructive">{modalError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsVehicleModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isModalSubmitting}>
                {isModalSubmitting ? "Saving..." : "Done"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
