import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requirePageRole } from "@/lib/auth";
import { getCustomerWithVehicles } from "@/actions/customers";
import { getActiveDiscountCardForCustomer } from "@/actions/discountCards";
import { AddVehicleDialog } from "./add-vehicle-dialog";
import { AssignDiscountDialog } from "../../discount-cards/assign-discount-dialog";
import { User, Phone, Mail, MapPin, Car, Tag, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(["admin", "manager"]);
  const { id } = await params;

  const result = await getCustomerWithVehicles(id);
  if (!result) {
    notFound();
  }

  const { customer, vehicles } = result;
  const activeDiscountCard = await getActiveDiscountCardForCustomer(id);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
      
      {/* ── MAIN COLUMN ── */}
      <div className="space-y-6">
        
        {/* HERO BOX */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <User className="size-5" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  Customer Profile
                </p>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {customer.name}
              </h1>
            </div>
            
            {activeDiscountCard && (
              <div className="flex items-center gap-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 backdrop-blur-md border border-amber-200/50 dark:border-amber-900/50 px-5 py-3 shadow-sm">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400">
                  <Tag className="size-6" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    {activeDiscountCard.discountPercent}% Discount
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Active Membership
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STATS/INFO ROW */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-4 text-center">
            <div className="mb-2 rounded-full bg-muted p-2 shadow-sm text-muted-foreground">
              <Phone className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Phone</p>
            <p className="mt-1 font-semibold">{customer.phone}</p>
          </div>
          
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-4 text-center">
            <div className="mb-2 rounded-full bg-muted p-2 shadow-sm text-muted-foreground">
              <Mail className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Email</p>
            <p className="mt-1 font-semibold truncate max-w-full px-2" title={customer.email || "—"}>
              {customer.email || "—"}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-4 text-center">
            <div className="mb-2 rounded-full bg-muted p-2 shadow-sm text-muted-foreground">
              <MapPin className="size-5" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Address</p>
            <p className="mt-1 font-semibold truncate max-w-full px-2" title={customer.address || "—"}>
              {customer.address || "—"}
            </p>
          </div>
        </div>

        {/* VEHICLES LIST */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight">Registered Vehicles</h3>
            <Badge variant="secondary" className="rounded-full px-3">{vehicles.length}</Badge>
          </div>
          
          <div className="space-y-3">
            {vehicles.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <Car className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No vehicles registered</p>
                <p className="text-xs text-muted-foreground">Add a vehicle to get started</p>
              </div>
            ) : (
              vehicles.map((vehicle) => (
                <div key={vehicle._id} className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border bg-card p-4 transition-all hover:bg-muted/30 hover:shadow-sm">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Car className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-lg leading-tight">
                      {vehicle.registrationNumber}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                      <span>{vehicle.make || "Unknown Make"}</span>
                      <span className="size-1 rounded-full bg-muted-foreground/30" />
                      <span>{vehicle.model || "Unknown Model"}</span>
                      {vehicle.year && (
                        <>
                          <span className="size-1 rounded-full bg-muted-foreground/30" />
                          <span>{vehicle.year}</span>
                        </>
                      )}
                      {vehicle.color && (
                        <>
                          <span className="size-1 rounded-full bg-muted-foreground/30" />
                          <span>{vehicle.color}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN (SIDEBAR) ── */}
      <div className="space-y-6">
        
        {/* QUICK ACTIONS */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="bg-muted/40 p-5 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings2 className="size-4 text-primary" /> 
              Customer Actions
            </h3>
          </div>
          <div className="p-5 space-y-4 flex flex-col">
            <AddVehicleDialog customerId={id} />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Membership</span>
              </div>
            </div>
            <AssignDiscountDialog presetCustomerId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
