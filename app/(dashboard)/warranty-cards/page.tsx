import { requirePageRole } from "@/lib/auth";
import { listWarrantyCards } from "@/actions/warranty";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Calendar, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

function isWarrantyActive(endDate: string) {
  return new Date(endDate).getTime() > Date.now();
}

export default async function WarrantyCardsPage() {
  await requirePageRole(["admin", "manager"]);
  const cards = await listWarrantyCards();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Warranty Cards</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {cards.length} card{cards.length !== 1 ? "s" : ""} issued
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {
              cards.filter((c: { endDate: string }) => isWarrantyActive(c.endDate))
                .length
            }{" "}
            active
          </span>
        </div>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted">
            <ShieldCheck className="size-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No warranty cards yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Issue a warranty card from a completed order
          </p>
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map(
          (card: {
            _id: string;
            cardNumber: string;
            jobCardId: { jobCardNumber: string } | null;
            customerId: { name: string } | null;
            startDate: string;
            endDate: string;
          }) => {
            const active = isWarrantyActive(card.endDate);
            const daysLeft = Math.ceil(
              (new Date(card.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={card._id}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                )}
              >
                {/* Top stripe */}
                <div
                  className={cn(
                    "h-1.5 w-full",
                    active
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : "bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10"
                  )}
                />

                <div className="flex flex-col gap-4 p-5">
                  {/* Card number + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex size-9 items-center justify-center rounded-xl",
                          active
                            ? "bg-emerald-100 dark:bg-emerald-950/50"
                            : "bg-muted"
                        )}
                      >
                        <ShieldCheck
                          className={cn(
                            "size-4",
                            active ? "text-emerald-600" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{card.cardNumber}</p>
                        <p className="text-xs text-muted-foreground">Warranty Card</p>
                      </div>
                    </div>
                    <Badge
                      variant={active ? "success" : "outline"}
                      className="shrink-0 text-[10px]"
                    >
                      {active ? "Active" : "Expired"}
                    </Badge>
                  </div>

                  {/* Customer */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Customer
                      </span>
                    </div>
                    <p className="font-medium">{card.customerId?.name ?? "—"}</p>
                  </div>

                  {/* Order card reference */}
                  {card.jobCardId && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileText className="size-3.5 text-primary/60" />
                      <span>{card.jobCardId.jobCardNumber}</span>
                    </div>
                  )}

                  {/* Validity range */}
                  <div className="rounded-xl border bg-muted/30 px-3 py-2.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="size-3.5" />
                      <span>Validity Period</span>
                    </div>
                    <p className="text-sm font-medium">
                      {new Date(card.startDate).toLocaleDateString()} —{" "}
                      {new Date(card.endDate).toLocaleDateString()}
                    </p>
                    {active && daysLeft > 0 && (
                      <p className="text-xs text-emerald-600">
                        {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
                      </p>
                    )}
                    {!active && (
                      <p className="text-xs text-destructive">
                        Expired {Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? "s" : ""} ago
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between border-t bg-muted/30 px-5 py-3">
                  <a
                    href={`/api/warranty/${card._id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <FileText className="size-3.5" />
                    View PDF
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
