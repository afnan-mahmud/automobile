"use client";

import { Badge } from "@/components/ui/badge";
import { AddServiceDialog } from "./add-service-dialog";
import { ServiceActions } from "./service-actions";
import { Settings2, Hash, DollarSign } from "lucide-react";

export type ServiceRow = {
  _id: string;
  name: string;
  department: string;
  expectedCosting: number;
};

export function ServiceList({ initialServices }: { initialServices: ServiceRow[] }) {
  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {initialServices.length} service{initialServices.length !== 1 ? "s" : ""}
          </span>
        </div>
        <AddServiceDialog />
      </div>

      {/* Empty state */}
      {initialServices.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <Settings2 className="mb-4 size-10 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-foreground">No services configured</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            You have not added any services yet. Create predefined services to simplify order creation and standardized billing.
          </p>
        </div>
      )}

      {/* Grid List */}
      {initialServices.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialServices.map((service) => (
            <div
              key={service._id}
              className="flex flex-col rounded-3xl border bg-card p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Settings2 className="size-6" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-muted/50 rounded-full font-mono font-normal">
                    ID: {service._id.slice(-6).toUpperCase()}
                  </Badge>
                  <ServiceActions service={service} />
                </div>
              </div>

              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-2">
                  {service.name}
                </h3>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="size-4 shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{service.department}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="size-4 shrink-0 text-muted-foreground/70" />
                  <span className="font-medium text-foreground">
                    ৳{service.expectedCosting.toLocaleString()} expected
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
