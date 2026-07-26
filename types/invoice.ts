export const INVOICE_STATUSES = ["draft", "sent", "paid", "partially_paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
