export const PRODUCT_CATEGORIES = ["retail", "part"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
