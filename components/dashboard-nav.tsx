"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Users,
  FileText,
  UserCog,
  CalendarCheck,
  Wallet,
  Package,
  Landmark,
  MessageSquare,
  ShieldCheck,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/models/User";

const navItems: { href: string; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "technician"] },
  { href: "/job-cards", label: "New Order", icon: Wrench, roles: ["admin", "manager", "technician"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["admin", "manager"] },
  { href: "/invoices", label: "Invoices", icon: FileText, roles: ["admin", "manager"] },
  { href: "/employees", label: "Employees", icon: UserCog, roles: ["admin"] },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, roles: ["admin", "manager"] },
  { href: "/salary", label: "Salary", icon: Wallet, roles: ["admin"] },
  { href: "/stock", label: "Stock", icon: Package, roles: ["admin", "manager"] },
  { href: "/accounts", label: "Accounts", icon: Landmark, roles: ["admin", "manager"] },
  { href: "/messages", label: "Messages", icon: MessageSquare, roles: ["admin", "manager"] },
  { href: "/warranty-cards", label: "Warranty Cards", icon: ShieldCheck, roles: ["admin", "manager"] },
  { href: "/discount-cards", label: "Discount Cards", icon: Tag, roles: ["admin", "manager"] },
];

export function DashboardNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-1 p-3">
      {visibleItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-4 rounded-full px-5 py-2.5 text-[15px] font-medium transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
