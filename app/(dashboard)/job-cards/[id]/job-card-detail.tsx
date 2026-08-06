"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  JOB_CARD_STATUSES,
  type JobCardStatus,
  type TaskStatus,
} from "@/types/jobCard";
import { updateJobCardStatus, updateTaskStatus, addPartsUsed } from "@/actions/jobCards";
import { generateInvoiceFromJobCard } from "@/actions/invoices";
import { createTrackingLink } from "@/actions/tracking";
import { AssignTaskDialog } from "./assign-task-dialog";
import { IssueWarrantyDialog } from "./issue-warranty-dialog";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  ClipboardList,
  Wrench,
  Camera,
  Package,
  Plus,
  Play,
  FileText,
  Link as LinkIcon,
  ShieldCheck,
  Car,
  Printer,
} from "lucide-react";

type Task = {
  _id: string;
  serviceId?: { _id: string; name: string; department: string };
  priority?: number;
  description: string;
  status: TaskStatus;
  assignedTo: { _id: string; name: string } | null;
  assignedDate: string;
  completedDate: string | null;
  carriedForwardFromDate: string | null;
};

type Photo = { _id: string; url: string; type: "before" | "after"; caption?: string };
type PartUsed = {
  _id: string;
  productId: { _id: string; name: string; sku: string } | string;
  quantity: number;
};

type JobCard = {
  _id: string;
  jobCardNumber: string;
  status: JobCardStatus;
  tasks: Task[];
  photos: Photo[];
  partsUsed: PartUsed[];
  customerId?: { name: string; phone: string; email?: string } | null;
  vehicleId?: { make?: string; model?: string; registrationNumber: string; year?: number } | null;
};

const STATUS_STYLE: Record<JobCardStatus, { label: string; class: string; icon: React.ReactNode }> = {
  open: {
    label: "Open",
    class: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
    icon: <ClipboardList className="size-5" />,
  },
  in_progress: {
    label: "In Progress",
    class: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
    icon: <Wrench className="size-5" />,
  },
  completed: {
    label: "Completed",
    class: "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400",
    icon: <CheckCircle2 className="size-5" />,
  },
  delivered: {
    label: "Delivered",
    class: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: <CheckCircle2 className="size-5" />,
  },
};

const TASK_STYLE: Record<TaskStatus, { label: string; class: string }> = {
  pending: { label: "Pending", class: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", class: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" },
  completed: { label: "Done", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" },
  carried_forward: { label: "Carried Over", class: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400" },
};

export function JobCardDetail({
  jobCard,
  session,
  employees,
  products,
  warrantyCard,
  services,
}: {
  jobCard: JobCard;
  session: { role: string; employeeId: string | null };
  employees: { _id: string; name: string; departments?: string[] }[];
  products: { _id: string; name: string; sku: string }[];
  warrantyCard: { _id: string; cardNumber: string } | null;
  services: { _id: string; name: string; department: string; expectedCosting: number }[];
}) {
  const router = useRouter();
  const isStaffManager = session.role === "admin" || session.role === "manager";
  const [statusError, setStatusError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoType, setPhotoType] = useState<"before" | "after">("before");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [partProductId, setPartProductId] = useState("");
  const [partQuantity, setPartQuantity] = useState("1");
  const [partError, setPartError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingCopied, setTrackingCopied] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  async function handleCopyTrackingLink() {
    setTrackingError(null);
    setTrackingCopied(false);
    setIsCreatingLink(true);
    const result = await createTrackingLink(jobCard._id);
    setIsCreatingLink(false);
    if (!result.success) {
      setTrackingError(result.error);
      return;
    }
    const url = `${window.location.origin}/track/${result.data.token}`;
    await navigator.clipboard.writeText(url);
    setTrackingCopied(true);
  }

  async function handleGenerateInvoice() {
    setInvoiceError(null);
    setIsGeneratingInvoice(true);
    const result = await generateInvoiceFromJobCard(jobCard._id);
    setIsGeneratingInvoice(false);
    if (!result.success) {
      setInvoiceError(result.error);
      return;
    }
    router.push(`/invoices/${result.data.id}`);
  }

  async function handleStatusChange(status: string) {
    setStatusError(null);
    const result = await updateJobCardStatus({
      id: jobCard._id,
      status: status as JobCardStatus,
    });
    if (!result.success) {
      setStatusError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleTaskStatusChange(taskId: string, status: TaskStatus) {
    const result = await updateTaskStatus({ jobCardId: jobCard._id, taskId, status });
    if (!result.success) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  function canCompleteTask(task: Task) {
    if (isStaffManager) return true;
    return (
      session.role === "technician" &&
      task.assignedTo?._id === session.employeeId
    );
  }

  async function handlePhotoUpload() {
    setPhotoError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setPhotoError("Choose a file first");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("jobCardId", jobCard._id);
    formData.append("type", photoType);

    setIsUploadingPhoto(true);
    const res = await fetch("/api/uploads", { method: "POST", body: formData });
    const body = await res.json();
    setIsUploadingPhoto(false);

    if (!res.ok) {
      setPhotoError(body.error ?? "Upload failed");
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function handleAddPart() {
    setPartError(null);
    if (!partProductId.trim()) {
      setPartError("Product is required");
      return;
    }
    const result = await addPartsUsed({
      jobCardId: jobCard._id,
      productId: partProductId,
      quantity: Number(partQuantity) || 1,
    });
    if (!result.success) {
      setPartError(result.error);
      return;
    }
    setPartProductId("");
    setPartQuantity("1");
    router.refresh();
  }

  const s = STATUS_STYLE[jobCard.status];
  const taskDone = jobCard.tasks.filter((t) => t.status === "completed").length;
  const taskTotal = jobCard.tasks.length;
  const progress = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
  const sortedTasks = [...jobCard.tasks].sort((a, b) => {
    return (a.priority || 999) - (b.priority || 999);
  });

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
      
      {/* ── MAIN COLUMN ── */}
      <div className="space-y-6">

        {/* HERO BOX */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-1">
                Order #{jobCard.jobCardNumber}
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {jobCard.customerId?.name ?? "Guest Customer"}
              </h1>
              {jobCard.customerId?.phone && (
                <p className="mt-1 text-muted-foreground">{jobCard.customerId.phone}</p>
              )}
            </div>
            
            {jobCard.vehicleId && (
              <div className="flex items-center gap-4 rounded-2xl bg-background/60 backdrop-blur-md border px-5 py-3 shadow-sm">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Car className="size-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {jobCard.vehicleId.registrationNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {jobCard.vehicleId.make} {jobCard.vehicleId.model} {jobCard.vehicleId.year}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* STATS ROW */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className={cn("flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-colors", s.class)}>
            <div className="mb-2 rounded-full bg-background/50 p-2 shadow-sm backdrop-blur-sm">
              {s.icon}
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Status</p>
            <p className="mt-1 text-lg font-bold leading-none">{s.label}</p>
          </div>
          
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-cyan-50/50 p-4 text-center text-cyan-600 dark:bg-cyan-950/20 dark:text-cyan-400">
            <div className="mb-2 rounded-full bg-background/50 p-2 shadow-sm backdrop-blur-sm text-cyan-600 dark:text-cyan-400">
              <ClipboardList className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Tasks</p>
            <p className="mt-1 text-lg font-bold leading-none">{taskDone} / {taskTotal}</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border bg-pink-50/50 p-4 text-center text-pink-600 dark:bg-pink-950/20 dark:text-pink-400">
            <div className="mb-2 rounded-full bg-background/50 p-2 shadow-sm backdrop-blur-sm text-pink-600 dark:text-pink-400">
              <Package className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Parts Used</p>
            <p className="mt-1 text-lg font-bold leading-none">{jobCard.partsUsed.length}</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border bg-purple-50/50 p-4 text-center text-purple-600 dark:bg-purple-950/20 dark:text-purple-400">
            <div className="mb-2 rounded-full bg-background/50 p-2 shadow-sm backdrop-blur-sm text-purple-600 dark:text-purple-400">
              <Camera className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Photos</p>
            <p className="mt-1 text-lg font-bold leading-none">{jobCard.photos.length}</p>
          </div>
        </div>

        {/* TASKS LIST */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight">Tasks Activity</h3>
            {isStaffManager && (
              <AssignTaskDialog
                jobCardId={jobCard._id}
                employees={employees}
                services={services}
              />
            )}
          </div>
          
          <div className="space-y-3">
            {jobCard.tasks.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <ClipboardList className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No tasks assigned</p>
                <p className="text-xs text-muted-foreground">Add tasks to get started</p>
              </div>
            )}
            
            {sortedTasks.map((task) => (
              <div key={task._id} className="group relative flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border bg-card p-4 transition-all hover:bg-muted/30 hover:shadow-sm">
                
                {/* Task Icon/Status Indicator & Info */}
                <div className="flex flex-1 items-start gap-4 min-w-0">
                  <div className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    task.status === "completed" ? "bg-success/10 text-success"
                      : task.status === "in_progress" ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {task.status === "completed" ? <CheckCircle2 className="size-5" /> : 
                     task.status === "in_progress" ? <Play className="size-5" /> :
                     <span className="font-bold text-sm">{task.priority || "-"}</span>}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className={cn(
                      "font-semibold text-foreground text-base leading-tight truncate",
                      task.status === "completed" && "text-muted-foreground line-through"
                    )}>
                      {task.serviceId ? task.serviceId.name : task.description}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                      {task.serviceId && (
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold text-muted-foreground px-1.5 h-5 rounded-md border-border/50">
                          {task.serviceId.department}
                        </Badge>
                      )}
                      {task.description && task.serviceId && (
                        <span className="text-sm text-muted-foreground italic truncate max-w-[200px]">
                          {task.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className={cn("hidden sm:inline-flex", TASK_STYLE[task.status].class)}>
                    {TASK_STYLE[task.status].label}
                  </Badge>
                  
                  {canCompleteTask(task) && task.status !== "completed" && (
                    <div className="flex items-center gap-2 ml-2 border-l pl-4 border-border/50">
                      {task.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full px-4 text-xs font-bold uppercase tracking-wider bg-transparent hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                          onClick={() => handleTaskStatusChange(task._id, "in_progress")}
                        >
                          <Play className="mr-1.5 size-3.5" /> Start
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-8 rounded-full px-4 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleTaskStatusChange(task._id, "completed")}
                      >
                        <CheckCircle2 className="mr-1.5 size-3.5" /> Done
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PHOTOS */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold tracking-tight">Photos</h3>
            {isStaffManager && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={photoType} onValueChange={(v) => setPhotoType(v as "before" | "after")}>
                  <SelectTrigger className="h-9 w-[110px] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">Before</SelectItem>
                    <SelectItem value="after">After</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*" 
                    className="h-9 max-w-[200px] cursor-pointer rounded-lg text-xs file:hidden pt-2" 
                  />
                  <Camera className="absolute right-2 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                </div>
                <Button onClick={handlePhotoUpload} disabled={isUploadingPhoto} size="sm" className="h-9 rounded-lg px-4">
                  {isUploadingPhoto ? "..." : "Upload"}
                </Button>
              </div>
            )}
          </div>
          {photoError && <p className="mb-4 text-sm text-destructive">{photoError}</p>}
          
          {jobCard.photos.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <Camera className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No photos attached</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {jobCard.photos.map((photo) => (
                <div key={photo._id} className="group relative aspect-square overflow-hidden rounded-xl border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? photo.type}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
                    <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-md border-white/10 shadow-none hover:bg-white/30 capitalize">
                      {photo.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT COLUMN (SIDEBAR) ── */}
      <div className="space-y-6">
        
        {/* QUICK ACTIONS */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="bg-muted/40 p-5 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="size-4 text-primary" /> 
              Order Actions
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {isStaffManager ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Status</label>
                  <Select
                    value={jobCard.status}
                    onValueChange={(v) => v && handleStatusChange(v)}
                  >
                    <SelectTrigger className="w-full rounded-xl h-11 bg-muted/50 border-transparent hover:border-border transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_CARD_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_STYLE[status].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {statusError && <p className="text-xs text-destructive">{statusError}</p>}
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <a
                    href={`/api/job-cards/${jobCard._id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 w-full items-center justify-start rounded-xl border bg-background hover:bg-muted/50 px-4 text-sm font-medium transition-colors"
                  >
                    <Printer className="mr-2 size-4 text-muted-foreground" />
                    Download Bill / Estimate PDF
                  </a>

                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl h-11 bg-background hover:bg-muted/50"
                    onClick={handleGenerateInvoice}
                    disabled={isGeneratingInvoice}
                  >
                    <FileText className="mr-2 size-4 text-muted-foreground" />
                    {isGeneratingInvoice ? "Generating..." : "Generate Invoice"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl h-11 bg-background hover:bg-muted/50"
                    onClick={handleCopyTrackingLink}
                    disabled={isCreatingLink}
                  >
                    <LinkIcon className="mr-2 size-4 text-muted-foreground" />
                    {isCreatingLink ? "Creating..." : trackingCopied ? "Link Copied!" : "Copy Tracking Link"}
                  </Button>

                  {warrantyCard ? (
                    <a
                      href={`/api/warranty/${warrantyCard._id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 w-full items-center justify-start rounded-xl border bg-primary/5 text-primary hover:bg-primary/10 px-4 text-sm font-medium transition-colors"
                    >
                      <ShieldCheck className="mr-2 size-4" />
                      View Warranty PDF
                    </a>
                  ) : (
                    <div className="w-full">
                      <IssueWarrantyDialog
                        jobCardId={jobCard._id}
                        disabled={!["completed", "delivered"].includes(jobCard.status)}
                      />
                    </div>
                  )}
                </div>
                {invoiceError && <p className="text-xs text-destructive">{invoiceError}</p>}
                {trackingError && <p className="text-xs text-destructive">{trackingError}</p>}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Badge variant="secondary" className="w-fit">
                  {STATUS_STYLE[jobCard.status].label}
                </Badge>
                <p className="text-sm text-muted-foreground">Only managers can perform billing actions.</p>
              </div>
            )}
          </div>
        </div>

        {/* PARTS USED */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="bg-muted/40 p-5 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="size-4 text-primary" /> 
              Parts & Materials
            </h3>
          </div>
          
          <div className="p-0">
            {jobCard.partsUsed.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No parts recorded.</p>
              </div>
            ) : (
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {jobCard.partsUsed.map((part) => (
                  <div key={part._id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {typeof part.productId === "string" ? part.productId : part.productId.name}
                      </p>
                      {typeof part.productId !== "string" && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{part.productId.sku}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-4 shrink-0 rounded-full font-mono">
                      x{part.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isStaffManager && (
            <div className="border-t bg-muted/20 p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add Material</p>
              <Select value={partProductId} onValueChange={(v) => setPartProductId(v ?? "")}>
                <SelectTrigger className="w-full rounded-xl bg-background">
                  <SelectValue placeholder="Select product">
                    {(value: string) => products.find((p) => p._id === value)?.name || "Select product"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(e.target.value)}
                  className="rounded-xl bg-background"
                  placeholder="Qty"
                />
                <Button onClick={handleAddPart} className="shrink-0 rounded-xl px-6">
                  <Plus className="mr-1 size-4" /> Add
                </Button>
              </div>
              {partError && <p className="text-xs text-destructive">{partError}</p>}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
