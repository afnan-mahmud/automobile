/**
 * Literal hex constants for recharts, which renders colors as raw SVG
 * stroke/fill attributes rather than CSS classes — it can't consume
 * Tailwind utilities or var(--token) references reliably across browsers.
 * Chosen to visually match the oklch tokens in app/globals.css.
 */
export const CHART_COLORS = {
  success: "#22c55e",
  warning: "#f59e0b",
  destructive: "#ef4444",
  chart1: "#2dd4bf",
  chart2: "#f59e0b",
  chart3: "#8b5cf6",
  chart4: "#ec4899",
  chart5: "#3b82f6",
} as const;
