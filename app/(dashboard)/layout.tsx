import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardHeader } from "@/components/dashboard-header";
import { SignOutButton } from "@/components/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session!.user.role;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex shadow-sm z-20">
        <div className="px-6 py-6 shrink-0">
          <span className="text-xl font-bold text-sidebar-foreground tracking-tight">Dhaka Automobiles</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          <DashboardNav role={role} />
        </div>
        <div className="flex items-center justify-between gap-2 p-6 mt-auto shrink-0 border-t border-sidebar-border/60">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {session?.user?.name}
            </p>
            <Badge variant="secondary" className="mt-1">
              {role}
            </Badge>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-y-auto">
        <DashboardHeader role={role} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
