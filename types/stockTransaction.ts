export const STOCK_TRANSACTION_TYPES = [
  "retail_sale",
  "job_card_usage",
  "purchase_in",
  "adjustment",
] as const;
export type StockTransactionType = (typeof STOCK_TRANSACTION_TYPES)[number];
