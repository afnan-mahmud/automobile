"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { searchCustomers } from "@/actions/customers";
import { Search, Phone, Mail, User, ArrowRight, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditCustomerDialog } from "./[id]/edit-customer-dialog";

type CustomerRow = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// Deterministic avatar color from name
const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-indigo-500",
  "bg-sky-500",
  "bg-teal-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-pink-500",
];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function CustomerSearchList({
  initialCustomers,
}: {
  initialCustomers: CustomerRow[];
}) {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      startTransition(async () => {
        const results = await searchCustomers(query);
        setCustomers(results as CustomerRow[]);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Empty state */}
      {customers.length === 0 && !isPending && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted">
            <User className="size-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No customers found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {query ? `No results for "${query}"` : "Add your first customer to get started"}
          </p>
        </div>
      )}

      {/* Card grid */}
      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          isPending && "opacity-60 transition-opacity"
        )}
      >
        {customers.map((customer) => (
          <div
            key={customer._id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            {/* Top accent */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary to-purple-400" />

            <div className="flex flex-col gap-4 p-5">
              {/* Avatar + name + Edit */}
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/customers/${customer._id}`}
                  className="flex items-center gap-3 min-w-0 flex-1 group/link"
                >
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm",
                      avatarColor(customer.name)
                    )}
                  >
                    {getInitials(customer.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold leading-snug group-hover/link:text-primary transition-colors">
                      {customer.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Customer</p>
                  </div>
                </Link>

                <EditCustomerDialog
                  customer={customer}
                  trigger={
                    <button
                      type="button"
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="Edit Customer"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  }
                />
              </div>

              {/* Contact info */}
              <Link href={`/customers/${customer._id}`} className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-3.5 shrink-0 text-primary/60" />
                  <span className="truncate">{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-3.5 shrink-0 text-primary/60" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
              </Link>
            </div>

            {/* Footer action */}
            <Link
              href={`/customers/${customer._id}`}
              className="mt-auto flex items-center justify-between border-t bg-muted/30 px-5 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="text-xs font-medium text-primary">View Profile</span>
              <ArrowRight className="size-3.5 text-primary transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
