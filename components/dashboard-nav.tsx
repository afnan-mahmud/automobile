"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/models/User";

const navItems: { href: string; label: string; roles: Role[] }[] = [
  { href: "/job-cards", label: "Job Cards", roles: ["admin", "manager", "technician"] },
  { href: "/customers", label: "Customers", roles: ["admin", "manager"] },
  { href: "/invoices", label: "Invoices", roles: ["admin", "manager"] },
  { href: "/employees", label: "Employees", roles: ["admin"] },
  { href: "/attendance", label: "Attendance", roles: ["admin", "manager"] },
  { href: "/salary", label: "Salary", roles: ["admin"] },
  { href: "/stock", label: "Stock", roles: ["admin", "manager"] },
  { href: "/accounts", label: "Accounts", roles: ["admin", "manager"] },
  { href: "/messages", label: "Messages", roles: ["admin", "manager"] },
  { href: "/warranty-cards", label: "Warranty Cards", roles: ["admin", "manager"] },
  { href: "/discount-cards", label: "Discount Cards", roles: ["admin", "manager"] },
];

export function DashboardNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-1 p-4">
      {visibleItems.map((item) => {
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
