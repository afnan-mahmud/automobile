"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  JOB_CARD_STATUSES,
  type JobCardStatus,
  type TaskStatus,
} from "@/types/jobCard";
import { jobCardStatusVariant, taskStatusVariant } from "@/lib/statusBadge";
import { updateJobCardStatus, updateTaskStatus, addPartsUsed } from "@/actions/jobCards";
import { generateInvoiceFromJobCard } from "@/actions/invoices";
import { createTrackingLink } from "@/actions/tracking";
import { AssignTaskDialog } from "./assign-task-dialog";
import { IssueWarrantyDialog } from "./issue-warranty-dialog";

type Task = {
  _id: string;
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
  status: JobCardStatus;
  tasks: Task[];
  photos: Photo[];
  partsUsed: PartUsed[];
};

const STATUS_LABEL: Record<JobCardStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  delivered: "Delivered",
};

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  carried_forward: "Carried Forward",
};

export function JobCardDetail({
  jobCard,
  session,
  employees,
  products,
  warrantyCard,
}: {
  jobCard: JobCard;
  session: { role: string; employeeId: string | null };
  employees: { _id: string; name: string }[];
  products: { _id: string; name: string; sku: string }[];
  warrantyCard: { _id: string; cardNumber: string } | null;
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Status</CardTitle>
          {isStaffManager && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyTrackingLink}
                  disabled={isCreatingLink}
                >
                  {isCreatingLink ? "Copying..." : trackingCopied ? "Copied!" : "Copy Tracking Link"}
                </Button>
                <Button size="sm" variant="outline" onClick={handleGenerateInvoice} disabled={isGeneratingInvoice}>
                  {isGeneratingInvoice ? "Generating..." : "Generate Invoice"}
                </Button>
                {warrantyCard ? (
                  <a
                    href={`/api/warranty/${warrantyCard._id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
                  >
                    Warranty PDF
                  </a>
                ) : (
                  <IssueWarrantyDialog
                    jobCardId={jobCard._id}
                    disabled={!["completed", "delivered"].includes(jobCard.status)}
                  />
                )}
              </div>
              {invoiceError && <p className="text-sm text-destructive">{invoiceError}</p>}
              {trackingError && <p className="text-sm text-destructive">{trackingError}</p>}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {isStaffManager ? (
            <Select
            value={jobCard.status}
            onValueChange={(v) => v && handleStatusChange(v)}
          >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_CARD_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant={jobCardStatusVariant(jobCard.status)}>
              {STATUS_LABEL[jobCard.status]}
            </Badge>
          )}
          {statusError && <p className="text-sm text-destructive">{statusError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tasks</CardTitle>
          {isStaffManager && (
            <AssignTaskDialog jobCardId={jobCard._id} employees={employees} />
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobCard.tasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No tasks yet.
                  </TableCell>
                </TableRow>
              )}
              {jobCard.tasks.map((task) => (
                <TableRow key={task._id}>
                  <TableCell>{task.description}</TableCell>
                  <TableCell>{task.assignedTo?.name ?? "—"}</TableCell>
                  <TableCell>
                    {new Date(task.assignedDate).toLocaleDateString()}
                    {task.carriedForwardFromDate && (
                      <Badge variant="warning" className="ml-2">
                        Carried forward from{" "}
                        {new Date(task.carriedForwardFromDate).toLocaleDateString()}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={taskStatusVariant(task.status)}>
                      {TASK_STATUS_LABEL[task.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canCompleteTask(task) && task.status !== "completed" && (
                      <div className="flex gap-2">
                        {task.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTaskStatusChange(task._id, "in_progress")}
                          >
                            Start
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleTaskStatusChange(task._id, "completed")}
                        >
                          Mark Complete
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobCard.photos.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {jobCard.photos.map((photo) => (
                <div key={photo._id} className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? photo.type}
                    className="aspect-square w-full rounded-md object-cover"
                  />
                  <Badge variant="secondary" className="capitalize">
                    {photo.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {isStaffManager && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={photoType} onValueChange={(v) => setPhotoType(v as "before" | "after")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before</SelectItem>
                  <SelectItem value="after">After</SelectItem>
                </SelectContent>
              </Select>
              <Input ref={fileInputRef} type="file" accept="image/*" className="max-w-xs" />
              <Button onClick={handlePhotoUpload} disabled={isUploadingPhoto} size="sm">
                {isUploadingPhoto ? "Uploading..." : "Upload"}
              </Button>
            </div>
          )}
          {photoError && <p className="text-sm text-destructive">{photoError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parts Used</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobCard.partsUsed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No parts recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {jobCard.partsUsed.map((part) => (
                <TableRow key={part._id}>
                  <TableCell>
                    {typeof part.productId === "string"
                      ? part.productId
                      : `${part.productId.name} (${part.productId.sku})`}
                  </TableCell>
                  <TableCell>{part.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isStaffManager && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Product</label>
                <Select value={partProductId} onValueChange={(v) => setPartProductId(v ?? "")}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(e.target.value)}
                  className="w-24"
                />
              </div>
              <Button size="sm" onClick={handleAddPart}>
                Add Part
              </Button>
            </div>
          )}
          {partError && <p className="text-sm text-destructive">{partError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
