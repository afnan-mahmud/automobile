import { DashboardNav } from "@/components/dashboard-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-card">
        <div className="border-b px-4 py-4">
          <span className="font-semibold">Dhaka Automobiles</span>
        </div>
        <DashboardNav />
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm">{session?.user?.name}</span>
            <Badge variant="secondary">{session?.user?.role}</Badge>
            <SignOutButton />
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
