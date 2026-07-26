import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { carryForwardOverdueTasks } from "@/lib/taskCarryForward";

export default async function DashboardPage() {
  // Lazy daily check — see lib/taskCarryForward.ts for why this runs here
  // instead of on a real cron.
  await carryForwardOverdueTasks();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dhaka Automobiles workshop management system. Use the sidebar to
            manage job cards, invoices, employees, stock, accounts, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
