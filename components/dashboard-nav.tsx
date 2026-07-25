"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/customers", label: "Customers" },
  { href: "/job-cards", label: "Job Cards" },
  { href: "/invoices", label: "Invoices" },
  { href: "/employees", label: "Employees" },
  { href: "/attendance", label: "Attendance" },
  { href: "/salary", label: "Salary" },
  { href: "/stock", label: "Stock" },
  { href: "/accounts", label: "Accounts" },
  { href: "/messages", label: "Messages" },
  { href: "/warranty-cards", label: "Warranty Cards" },
  { href: "/discount-cards", label: "Discount Cards" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
