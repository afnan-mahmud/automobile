import type { JobCardStatus, TaskStatus } from "@/types/jobCard";
import type { InvoiceStatus } from "@/types/invoice";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

export function jobCardStatusVariant(status: JobCardStatus): BadgeVariant {
  switch (status) {
    case "open":
      return "outline";
    case "in_progress":
      return "warning";
    case "completed":
    case "delivered":
      return "success";
  }
}

export function taskStatusVariant(status: TaskStatus): BadgeVariant {
  switch (status) {
    case "pending":
      return "outline";
    case "in_progress":
      return "warning";
    case "completed":
      return "success";
    case "carried_forward":
      return "warning";
  }
}

export function invoiceStatusVariant(status: InvoiceStatus): BadgeVariant {
  switch (status) {
    case "draft":
      return "outline";
    case "sent":
      return "warning";
    case "paid":
      return "success";
    case "partially_paid":
      return "warning";
  }
}

export function messageStatusVariant(
  status: "sent" | "failed" | "pending"
): BadgeVariant {
  switch (status) {
    case "sent":
      return "success";
    case "failed":
      return "destructive";
    case "pending":
      return "outline";
  }
}

export function positiveNegativeVariant(isPositive: boolean): BadgeVariant {
  return isPositive ? "success" : "destructive";
}

export function lowStockVariant(isLow: boolean): BadgeVariant {
  return isLow ? "warning" : "outline";
}
