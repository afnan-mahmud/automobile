"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search, User, Phone, Mail, Car, Hash, Calendar, Palette, Plus, X, UserCircle, Play, BadgeCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Employee = { _id: string; name: string; designation?: string; departments?: string[] };
type Service = { _id: string; name: string; department: string; expectedCosting: number };
type CustomerRow = { _id: string; name: string; phone: string };
type VehicleRow = {
  _id: string;
  registrationNumber: string;
  make?: string;
  model?: string;
};

type TaskRow = { serviceId: string; description: string; assignedTo: string; assignedDate: string; priority: number };

const today = () => new Date().toISOString().slice(0, 10);

export function NewJobCardForm({ employees, services }: { employees: Employee[], services: Service[] }) {
  const router = useRouter();
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [tasks, setTasks] = useState<TaskRow[]>([
    { serviceId: "", description: "", assignedTo: "", assignedDate: today(), priority: 1 },
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
      { serviceId: "", description: "", assignedTo: "", assignedDate: today(), priority: prev.length + 1 },
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
      .filter((t) => t.serviceId && t.assignedTo)
      .map((t) => ({
        serviceId: t.serviceId,
        description: t.description,
        assignedTo: t.assignedTo,
        assignedDate: new Date(t.assignedDate),
        priority: t.priority,
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
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
      
      {/* ── MAIN COLUMN ── */}
      <div className="space-y-6">
        
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/80 to-purple-500 p-8 text-primary-foreground shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80 mb-1">
                New Request
              </p>
              <h1 className="text-3xl font-bold tracking-tight">
                Create Order Card
              </h1>
              <p className="mt-2 text-primary-foreground/80 max-w-md text-sm leading-relaxed">
                Start by searching for an existing customer or create a new profile. Assign a vehicle and list the required service tasks.
              </p>
            </div>
          </div>
          {/* Abstract decoration */}
          <div className="absolute -right-8 -top-8 size-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-12 right-16 size-32 rounded-full bg-black/10 blur-2xl" />
        </div>

        {/* CUSTOMER & VEHICLE SELECTION */}
        <div className="rounded-3xl border bg-card p-6 sm:p-8 shadow-sm">
          <h3 className="mb-6 text-xl font-bold tracking-tight flex items-center gap-2">
            <UserCircle className="size-5 text-primary" />
            Client Details
          </h3>
          
          {!selectedCustomer ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 size-5 text-muted-foreground" />
                <Input
                  id="customer-search"
                  placeholder="Search customer by name or phone..."
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  className="h-12 w-full rounded-2xl bg-muted/40 pl-11 text-base border-transparent hover:border-border focus:bg-background focus:border-primary transition-all"
                  autoComplete="off"
                />
              </div>

              {customerQuery.length > 0 && customers.length === 0 && (
                <div className="rounded-2xl border border-dashed p-6 text-center bg-muted/20">
                  <User className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">No customer found</p>
                  <Button
                    variant="outline"
                    className="mt-3 rounded-full"
                    onClick={() => {
                      setNewCustomer(prev => ({ ...prev, phone: customerQuery }));
                      setIsCustomerModalOpen(true);
                    }}
                  >
                    <Plus className="mr-2 size-4" /> Create New Customer
                  </Button>
                </div>
              )}

              {customers.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {customers.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      className="group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all hover:bg-muted/40 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary"
                      onClick={() => selectCustomer(c)}
                    >
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <User className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected Customer Card */}
              <div className="flex items-center justify-between rounded-2xl border bg-primary/5 p-4 shadow-sm border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <User className="size-6" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerQuery("");
                    setVehicles([]);
                    setVehicleId("");
                  }}
                  title="Change customer"
                >
                  <X className="size-5" />
                </Button>
              </div>

              {/* Vehicle Selection */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Select Vehicle</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={() => setIsVehicleModalOpen(true)}
                  >
                    <Plus className="mr-1 size-3.5" /> Add Vehicle
                  </Button>
                </div>

                {vehicles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-center bg-muted/20">
                    <Car className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No vehicles registered</p>
                    <p className="text-xs text-muted-foreground mt-1">Please add a vehicle to continue</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {vehicles.map((v) => {
                      const isSelected = vehicleId === v._id;
                      return (
                        <button
                          key={v._id}
                          type="button"
                          className={cn(
                            "group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary",
                            isSelected
                              ? "bg-primary/5 border-primary ring-1 ring-primary"
                              : "hover:bg-muted/40 hover:border-primary/30"
                          )}
                          onClick={() => setVehicleId(v._id)}
                        >
                          <div className={cn(
                            "flex size-10 items-center justify-center rounded-full transition-colors",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                          )}>
                            <Car className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className={cn("font-semibold truncate", isSelected ? "text-primary" : "text-foreground")}>
                              {v.registrationNumber}
                            </p>
                            {(v.make || v.model) && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {v.make} {v.model}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <BadgeCheck className="ml-auto size-5 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* TASKS ASSIGNMENT */}
        <div className="rounded-3xl border bg-card p-6 sm:p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Play className="size-5 text-primary" />
              Service Tasks
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-8"
              onClick={addTaskRow}
            >
              <Plus className="mr-1.5 size-3.5" /> Add Task
            </Button>
          </div>

          <div className="space-y-3">
            {tasks.map((task, index) => {
              const selectedService = services.find((s) => s._id === task.serviceId);
              const assignableEmployees = selectedService
                ? employees.filter((emp) => emp.departments?.includes(selectedService.department))
                : employees;

              return (
                <div key={index} className="group relative flex flex-col gap-3 rounded-2xl border bg-muted/20 p-4 transition-all hover:bg-muted/40 focus-within:bg-muted/40 focus-within:border-primary/30">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="shrink-0 w-16">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Priority"
                        value={task.priority}
                        onChange={(e) => updateTask(index, { priority: parseInt(e.target.value) || 1 })}
                        className="h-10 rounded-xl bg-transparent border-border/50 text-center shadow-none focus-visible:ring-1"
                        title="Priority / Step"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <Select
                        value={task.serviceId}
                        onValueChange={(v) => updateTask(index, { serviceId: v ?? "", assignedTo: "" })}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background border-border/50 shadow-none">
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
                      <Input
                        placeholder="Optional custom notes (e.g. Bring own oil)..."
                        value={task.description}
                        onChange={(e) => updateTask(index, { description: e.target.value })}
                        className="h-9 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0 placeholder:italic"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 sm:pl-3 sm:border-l sm:border-border/50 shrink-0 self-start">
                      <Select
                        value={task.assignedTo}
                        onValueChange={(v) => updateTask(index, { assignedTo: v ?? "" })}
                        disabled={!task.serviceId}
                      >
                        <SelectTrigger className="w-[150px] h-10 rounded-xl border-transparent bg-muted/50 hover:bg-muted focus:ring-0">
                          <SelectValue placeholder="Assign To">
                            {(value: string) => employees.find((e) => e._id === value)?.name || "Assign To"}
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

                      <Input
                        type="date"
                        value={task.assignedDate}
                        onChange={(e) => updateTask(index, { assignedDate: e.target.value })}
                        className="w-[140px] h-10 rounded-xl border-transparent bg-muted/50 hover:bg-muted focus-visible:ring-0 text-sm"
                      />

                      {tasks.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                          onClick={() => removeTaskRow(index)}
                          title="Remove task"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── SIDEBAR COLUMN ── */}
      <div className="space-y-6">
        
        {/* ORDER SUMMARY */}
        <div className="sticky top-6 rounded-3xl border bg-card shadow-sm overflow-hidden flex flex-col h-[calc(100vh-6rem)] max-h-[600px]">
          <div className="bg-muted/40 p-6 border-b">
            <h3 className="font-bold text-lg">Order Summary</h3>
            <p className="text-sm text-muted-foreground mt-1">Review before saving</p>
          </div>
          
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</p>
              {selectedCustomer ? (
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="size-4" />
                  </div>
                  <p className="font-medium truncate">{selectedCustomer.name}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not selected</p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vehicle</p>
              {selectedVehicle ? (
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Car className="size-4" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedVehicle.registrationNumber}</p>
                    {(selectedVehicle.make || selectedVehicle.model) && (
                      <p className="text-xs text-muted-foreground">{selectedVehicle.make} {selectedVehicle.model}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not selected</p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tasks Queue</p>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="rounded-full px-3 py-1 font-mono text-base bg-muted/60">
                  {tasks.filter(t => t.description.trim()).length}
                </Badge>
                <p className="text-sm font-medium">Valid tasks added</p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
                {error}
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-muted/20">
            <Button
              className="w-full rounded-2xl h-14 text-base font-bold shadow-md shadow-primary/20"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedCustomer || !vehicleId}
            >
              {isSubmitting ? "Creating Order..." : "Create Order Card"}
            </Button>
          </div>
        </div>

      </div>

      {/* CREATE CUSTOMER MODAL */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <form onSubmit={handleCreateCustomer}>
            <DialogHeader className="mb-4">
              <DialogTitle>Create New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <FormField label="Name" htmlFor="c-name" icon={<User className="size-4" />}>
                <Input
                  id="c-name"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Phone" htmlFor="c-phone" icon={<Phone className="size-4" />}>
                <Input
                  id="c-phone"
                  required
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Email (Optional)" htmlFor="c-email" icon={<Mail className="size-4" />}>
                <Input
                  id="c-email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              {modalError && <FormError message={modalError} />}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsCustomerModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isModalSubmitting} className="rounded-xl px-6">
                {isModalSubmitting ? "Saving..." : "Save Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE VEHICLE MODAL */}
      <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <form onSubmit={handleCreateVehicle}>
            <DialogHeader className="mb-4">
              <DialogTitle>Register New Vehicle</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FormField label="Registration Number" htmlFor="v-reg" icon={<Hash className="size-4" />}>
                  <Input
                    id="v-reg"
                    required
                    placeholder="e.g. DHK-12-3456"
                    value={newVehicle.registrationNumber}
                    onChange={(e) => setNewVehicle({ ...newVehicle, registrationNumber: e.target.value })}
                    className={fieldInputClass}
                  />
                </FormField>
              </div>
              <FormField label="Make" htmlFor="v-make" icon={<Car className="size-4" />}>
                <Input
                  id="v-make"
                  placeholder="e.g. Toyota"
                  value={newVehicle.make}
                  onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Model" htmlFor="v-model" icon={<Car className="size-4" />}>
                <Input
                  id="v-model"
                  placeholder="e.g. Corolla"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Year" htmlFor="v-year" icon={<Calendar className="size-4" />}>
                <Input
                  id="v-year"
                  type="number"
                  placeholder="2020"
                  value={newVehicle.year}
                  onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Color" htmlFor="v-color" icon={<Palette className="size-4" />}>
                <Input
                  id="v-color"
                  placeholder="e.g. Silver"
                  value={newVehicle.color}
                  onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              {modalError && <div className="col-span-2"><FormError message={modalError} /></div>}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsVehicleModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isModalSubmitting} className="rounded-xl px-6">
                {isModalSubmitting ? "Saving..." : "Save Vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
