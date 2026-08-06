import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { requirePageRole } from "@/lib/auth";
import { getFinanceDashboardSummary, getDailyIncomeExpense } from "@/actions/accounts";
import { resolvePreset } from "@/lib/dateRange";
import { CHART_COLORS } from "@/lib/chartColors";
import { IncomeExpenseChart } from "./income-expense-chart";

export default async function FinanceDashboardPage() {
  await requirePageRole(["admin"]);

  const range = resolvePreset("last30");
  const [summary, daily] = await Promise.all([
    getFinanceDashboardSummary(range),
    getDailyIncomeExpense(range),
  ]);

  const incomeSparkline = daily.map((d: { income: number }) => ({ value: d.income }));
  const expenseSparkline = daily.map((d: { expense: number }) => ({ value: d.expense }));
  const profitSparkline = daily.map((d: { income: number; expense: number }) => ({
    value: d.income - d.expense,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Finance Dashboard</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales"
          value={`৳${summary.totalIncome.toFixed(2)}`}
          sparkline={incomeSparkline}
          sparklineColor={CHART_COLORS.success}
        />
        <StatCard
          title="Net Profit"
          value={`৳${summary.netProfit.toFixed(2)}`}
          sparkline={profitSparkline}
          sparklineColor={CHART_COLORS.chart3}
        />
        <StatCard title="Outstanding Dues" value={`৳${summary.outstandingDues.toFixed(2)}`} />
        <StatCard
          title="Total Expense"
          value={`৳${summary.totalExpense.toFixed(2)}`}
          sparkline={expenseSparkline}
          sparklineColor={CHART_COLORS.destructive}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash / Bank / Mobile Banking Split</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          {summary.byPaymentMethod.map((p) => (
            <div key={p.paymentMethod} className="space-y-1">
              <p className="font-medium capitalize">{p.paymentMethod.replace("_", " ")}</p>
              <p className="text-success">Income: ৳{p.income.toFixed(2)}</p>
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
