"use client";

import { Badge } from "@/components/ui/badge";
import { AssignDiscountDialog } from "./assign-discount-dialog";
import { Tag, Calendar, User, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

type DiscountCardRow = {
  _id: string;
  customerId: { name: string; phone: string } | null;
  discountPercent: number;
  validFrom: string;
  validTo: string | null;
  active: boolean;
};

function isExpired(card: DiscountCardRow) {
  if (!card.active) return true;
  if (card.validTo && new Date(card.validTo).getTime() < Date.now()) return true;
  return false;
}

function daysUntilExpiry(card: DiscountCardRow): number | null {
  if (!card.validTo) return null;
  return Math.ceil((new Date(card.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// Determine accent color from discount percent
function discountGradient(pct: number) {
  if (pct >= 20) return "from-rose-500 to-pink-500";
  if (pct >= 10) return "from-violet-500 to-purple-600";
  if (pct >= 5) return "from-amber-400 to-orange-500";
  return "from-sky-500 to-blue-600";
}

export function DiscountCardList({ initialCards }: { initialCards: DiscountCardRow[] }) {
  const activeCards = initialCards.filter((c) => !isExpired(c));
  
  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {initialCards.length} card{initialCards.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-muted-foreground/40">·</span>
          <span className="text-sm text-success">{activeCards.length} active</span>
        </div>
        <AssignDiscountDialog />
      </div>

      {/* Empty state */}
      {initialCards.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Tag className="size-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No discount cards yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Assign a discount card to a customer</p>
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {initialCards.map((card) => {
          const expired = isExpired(card);
          const days = daysUntilExpiry(card);
          const gradient = discountGradient(card.discountPercent);

          return (
            <div
              key={card._id}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                expired && "opacity-75"
              )}
            >
              {/* Top stripe */}
              <div
                className={cn(
                  "h-1.5 w-full bg-gradient-to-r",
                  expired ? "from-muted-foreground/30 to-muted-foreground/10" : gradient
                )}
              />

              <div className="flex flex-col gap-4 p-5">
                {/* Discount percent — hero element */}
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "flex items-end gap-1 rounded-2xl bg-gradient-to-br px-4 py-3 text-white",
                      expired ? "from-muted to-muted/50 text-muted-foreground" : gradient
                    )}
                  >
                    <span className="text-3xl font-bold leading-none">
                      {card.discountPercent}
                    </span>
                    <span className="mb-0.5 text-lg font-semibold opacity-80">%</span>
                  </div>
                  <Badge
                    variant={expired ? "outline" : "success"}
                    className="shrink-0 text-[10px]"
                  >
                    {expired ? "Expired" : "Active"}
                  </Badge>
                </div>

                {/* Customer */}
                <div className="flex items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <User className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {card.customerId?.name ?? "Unassigned"}
                    </p>
                    {card.customerId?.phone && (
                      <p className="text-xs text-muted-foreground">{card.customerId.phone}</p>
                    )}
                  </div>
                </div>

                {/* Validity */}
                <div className="rounded-xl border bg-muted/30 px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    <span>Validity</span>
                  </div>
                  <p className="text-sm font-medium">
                    {new Date(card.validFrom).toLocaleDateString()}
                    {card.validTo
                      ? ` — ${new Date(card.validTo).toLocaleDateString()}`
                      : " — Indefinite"}
                  </p>
                  {!expired && days !== null && days > 0 && (
                    <p className="text-xs text-emerald-600">
                      {days} day{days !== 1 ? "s" : ""} remaining
                    </p>
                  )}
                  {!expired && days === null && (
                    <p className="text-xs text-primary">No expiry</p>
                  )}
                  {expired && card.validTo && (
                    <p className="text-xs text-destructive">
                      Expired {Math.abs(days ?? 0)} day{Math.abs(days ?? 0) !== 1 ? "s" : ""} ago
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
