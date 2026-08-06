export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export function isPartLineItem(description: string): boolean {
  const desc = description.trim().toLowerCase();
  return (
    desc.startsWith("part:") ||
    desc.startsWith("part -") ||
    desc.startsWith("part /") ||
    desc.startsWith("part-") ||
    desc === "part"
  );
}

export function computeTotals(
  lineItems: InvoiceLineItem[],
  discountPercent: number
): { subtotal: number; discountAmount: number; total: number } {
  const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);

  // Discount applies only to Service charge / Labor cost, never on Parts
  const serviceChargeSubtotal = lineItems
    .filter((li) => !isPartLineItem(li.description))
    .reduce((sum, li) => sum + li.total, 0);

  const discountAmount =
    Math.round(serviceChargeSubtotal * (discountPercent / 100) * 100) / 100;
  const total = Math.max(0, subtotal - discountAmount);

  return { subtotal, discountAmount, total };
}
