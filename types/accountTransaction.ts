export const TRANSACTION_TYPES = ["income", "expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_CATEGORIES = [
  "service_sale",
  "product_purchase",
  "salary",
  "operational_cost",
  "other",
] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const PAYMENT_METHODS = ["cash", "bank", "mobile_banking"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
