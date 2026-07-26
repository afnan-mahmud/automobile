"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FormField, FormError, fieldInputClass, fieldSelectClass } from "@/components/ui/form-field";
import {
  Search, User, Phone, Mail, Car, Hash, Calendar, Palette, Plus, X, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

    setIsCustomerModalOpen(false);
    const created = { _id: result.data.id, name: newCustomer.name, phone: phoneToUse };
    setSelectedCustomer(created);
    setVehicles([]);

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

  const selectedVehicle = vehicles.find(v => v._id === vehicleId);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Customer & Vehicle Card */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="size-5 text-primary" />
            Customer &amp; Vehicle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          {!selectedCustomer ? (
            <div className="space-y-3">
              <FormField label="Search Customer" htmlFor="customer-search">
                <div className="flex items-center gap-2 px-3">
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="customer-search"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Search by name or phone…"
                    className={fieldInputClass}
                  />
                </div>
              </FormField>

              {/* Search results dropdown */}
              {customers.length > 0 && (
                <div className="overflow-hidden rounded-xl border bg-background shadow-lg">
                  {customers.map((c, i) => (
                    <button
                      type="button"
                      key={c._id}
                      onClick={() => selectCustomer(c)}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-accent",
                        i > 0 && "border-t"
                      )}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <User className="size-4 text-muted-foreground" />
                        {c.name}
                      </span>
                      <span className="text-muted-foreground">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* No results — show Create Customer button */}
              {customerQuery && customers.length === 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/30 px-4 py-3">
                  <p className="flex-1 text-sm text-muted-foreground">
                    No customer found for <span className="font-medium text-foreground">&quot;{customerQuery}&quot;</span>
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setNewCustomer({ name: "", phone: customerQuery, email: "" });
                      setIsCustomerModalOpen(true);
                    }}
                  >
                    <Plus className="mr-1.5 size-3.5" />
                    Create Customer
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected customer chip */}
              <div className="flex items-center justify-between rounded-xl bg-primary/8 border border-primary/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/15">
                    <User className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{selectedCustomer.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                  </div>
                </div>
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

              {/* Vehicle selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewVehicle({ registrationNumber: "", make: "", model: "", year: "", color: "" });
                      setIsVehicleModalOpen(true);
                    }}
                  >
                    <Plus className="mr-1.5 size-3.5" />
                    Add Vehicle
                  </Button>
                </div>

                {vehicles.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-4 text-center">
                    <Car className="mx-auto mb-1.5 size-6 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No vehicles on file for this customer.</p>
                  </div>
                ) : (
                  <Select value={vehicleId} onValueChange={(v) => setVehicleId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      {selectedVehicle ? (
                        <div className="flex items-center gap-2">
                          <Car className="size-4 text-muted-foreground" />
                          <span>
                            {selectedVehicle.registrationNumber}
                            {selectedVehicle.make && ` — ${selectedVehicle.make} ${selectedVehicle.model ?? ""}`}
                          </span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Select a vehicle" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v._id} value={v._id}>
                          {`${v.registrationNumber}${v.make ? ` — ${v.make} ${v.model ?? ""}` : ""}`.trim()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks Card */}
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
              Initial Tasks
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addTaskRow}>
              <Plus className="mr-1.5 size-3.5" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No tasks yet. Click &ldquo;Add Task&rdquo; to get started.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-xl border bg-muted/20 p-3"
                >
                  <Input
                    value={task.description}
                    onChange={(e) => updateTask(index, { description: e.target.value })}
                    placeholder="e.g. Change engine oil"
                    className="border-0 bg-transparent focus-visible:ring-0 text-sm"
                  />
                  <Select
                    value={task.assignedTo}
                    onValueChange={(v) => updateTask(index, { assignedTo: v ?? "" })}
                  >
                    <SelectTrigger className="w-36 border-muted bg-background text-sm">
                      <SelectValue placeholder="Assign to…">
                        {employees.find(emp => emp._id === task.assignedTo)?.name || "Assign to…"}
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
                  <Input
                    type="date"
                    value={task.assignedDate}
                    onChange={(e) => updateTask(index, { assignedDate: e.target.value })}
                    className="w-36 border-muted bg-background text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTaskRow(index)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FormError message={error} />

      <Button onClick={handleSubmit} disabled={isSubmitting} className="px-8">
        {isSubmitting ? "Creating..." : "Create New Order"}
      </Button>

      {/* Customer Modal */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4 pt-1">
            <FormField label="Full Name" htmlFor="modal-cust-name">
              <div className="flex items-center gap-2 px-3">
                <User className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="modal-cust-name"
                  placeholder="Full name"
                  className={fieldInputClass}
                  value={newCustomer.name}
                  onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
            </FormField>

            <FormField label="Phone" htmlFor="modal-cust-phone">
              <div className="flex items-center gap-2 px-3">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="modal-cust-phone"
                  placeholder="01XXXXXXXXX"
                  className={fieldInputClass}
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
            </FormField>

            <FormField label="Email" htmlFor="modal-cust-email" optional>
              <div className="flex items-center gap-2 px-3">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="modal-cust-email"
                  type="email"
                  placeholder="customer@email.com"
                  className={fieldInputClass}
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </FormField>

            <FormError message={modalError} />

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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateVehicle} className="space-y-4 pt-1">
            <FormField label="Registration Number" htmlFor="modal-veh-reg">
              <div className="flex items-center gap-2 px-3">
                <Hash className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="modal-veh-reg"
                  placeholder="DHAKA-METRO-GA-11-1234"
                  className={fieldInputClass}
                  value={newVehicle.registrationNumber}
                  onChange={e => setNewVehicle(prev => ({ ...prev, registrationNumber: e.target.value }))}
                  required
                />
              </div>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Make" htmlFor="modal-veh-make" optional>
                <div className="flex items-center gap-2 px-3">
                  <Car className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="modal-veh-make"
                    placeholder="Toyota"
                    className={fieldInputClass}
                    value={newVehicle.make}
                    onChange={e => setNewVehicle(prev => ({ ...prev, make: e.target.value }))}
                  />
                </div>
              </FormField>
              <FormField label="Model" htmlFor="modal-veh-model" optional>
                <Input
                  id="modal-veh-model"
                  placeholder="Corolla"
                  className={`${fieldInputClass} px-3`}
                  value={newVehicle.model}
                  onChange={e => setNewVehicle(prev => ({ ...prev, model: e.target.value }))}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Year" htmlFor="modal-veh-year" optional>
                <div className="flex items-center gap-2 px-3">
                  <Calendar className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="modal-veh-year"
                    type="number"
                    placeholder="2020"
                    className={fieldInputClass}
                    value={newVehicle.year}
                    onChange={e => setNewVehicle(prev => ({ ...prev, year: e.target.value }))}
                  />
                </div>
              </FormField>
              <FormField label="Color" htmlFor="modal-veh-color" optional>
                <div className="flex items-center gap-2 px-3">
                  <Palette className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="modal-veh-color"
                    placeholder="White"
                    className={fieldInputClass}
                    value={newVehicle.color}
                    onChange={e => setNewVehicle(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
              </FormField>
            </div>

            <FormError message={modalError} />

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
