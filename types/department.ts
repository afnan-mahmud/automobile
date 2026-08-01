export const DEPARTMENTS = [
  "Engine & Mechanics",
  "Denting & Painting",
  "Wash & Detailing",
  "Electrical & AC",
  "Wheel & Tire",
  "General Maintenance",
  "Other"
] as const;

export type Department = typeof DEPARTMENTS[number];
