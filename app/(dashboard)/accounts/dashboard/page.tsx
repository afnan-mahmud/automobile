import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageRole } from "@/lib/auth";
import { getFinanceDashboardSummary, getDailyIncomeExpense } from "@/actions/accounts";
import { IncomeExpenseChart } from "./income-expense-chart";

export default async function FinanceDashboardPage() {
  await requirePageRole(["admin"]);

  const [summary, daily] = await Promise.all([
    getFinanceDashboardSummary(),
    getDailyIncomeExpense(30),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Finance Dashboard</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total Sales</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            ৳{summary.totalIncome.toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Net Profit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            ৳{summary.netProfit.toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Outstanding Dues</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            ৳{summary.outstandingDues.toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total Expense</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            ৳{summary.totalExpense.toFixed(2)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash / Bank / Mobile Banking Split</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          {summary.byPaymentMethod.map((p) => (
            <div key={p.paymentMethod} className="space-y-1">
              <p className="font-medium capitalize">{p.paymentMethod.replace("_", " ")}</p>
              <p className="text-emerald-600">Income: ৳{p.income.toFixed(2)}</p>
              <p className="text-destructive">Expense: ৳{p.expense.toFixed(2)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Income vs Expense (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeExpenseChart data={daily} />
        </CardContent>
      </Card>
    </div>
  );
}
