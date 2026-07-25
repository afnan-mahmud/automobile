import { DashboardNav } from "@/components/dashboard-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
