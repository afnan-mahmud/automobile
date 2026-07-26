import { requirePageRole } from "@/lib/auth";
import { StatCard } from "@/components/stat-card";
import { getFinanceDashboardSummary, getDailyIncomeExpense } from "@/actions/accounts";
import { listProducts } from "@/actions/stock";
import { listJobCards } from "@/actions/jobCards";
import {
  getJobCardStatusBreakdown,
  getTopServicedVehicles,
  getTechnicianDashboard,
} from "@/actions/dashboard";
import { JobCardStatusChart } from "./job-card-status-chart";
import { RecentJobCardsPanel } from "./recent-job-cards-panel";
import { TopVehiclesTable } from "./top-vehicles-table";

function monthRange(monthOffset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end =
    monthOffset === 0
      ? now
      : new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function DashboardPage() {
  const session = await requirePageRole(["admin", "manager", "technician"]);
  const role = session.user.role;

  if (role === "technician") {
    const { pending, completedThisWeek, recentJobCards } = await getTechnicianDashboard();
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <StatCard title="My Pending Tasks" value={String(pending)} variant="primary" progress={100} />
          <StatCard title="Completed This Week" value={String(completedThisWeek)} />
        </div>
        <RecentJobCardsPanel jobCards={recentJobCards} />
      </div>
    );
  }

  const [statusBreakdown, jobCards, products] = await Promise.all([
    getJobCardStatusBreakdown(),
    listJobCards("all"),
    listProducts(),
  ]);
  const lowStockCount = products.filter(
    (p: { quantityInStock: number; reorderLevel?: number }) =>
      p.reorderLevel !== undefined && p.quantityInStock <= p.reorderLevel
  ).length;
  const openCount = jobCards.filter((jc: { status: string }) => jc.status === "open").length;
  const inProgressCount = jobCards.filter(
    (jc: { status: string }) => jc.status === "in_progress"
  ).length;

  if (role === "manager") {
    const topVehicles = await getTopServicedVehicles();
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCard title="Open Orders" value={String(openCount)} variant="primary" progress={75} />
          <StatCard title="In-Progress Orders" value={String(inProgressCount)} variant="primary" progress={45} />
          <StatCard title="Low Stock Items" value={String(lowStockCount)} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <JobCardStatusChart data={statusBreakdown} />
          <RecentJobCardsPanel jobCards={jobCards.slice(0, 5)} />
        </div>
        <TopVehiclesTable vehicles={topVehicles} />
      </div>
    );
  }

  const thisMonth = monthRange(0);
  const prevMonth = monthRange(-1);
  const [thisMonthSummary, prevMonthSummary, daily, topVehicles] = await Promise.all([
    getFinanceDashboardSummary(thisMonth.start, thisMonth.end),
    getFinanceDashboardSummary(prevMonth.start, prevMonth.end),
    getDailyIncomeExpense(30),
    getTopServicedVehicles(),
  ]);
  const trendPercent =
    prevMonthSummary.totalIncome === 0
      ? null
      : Math.round(
          ((thisMonthSummary.totalIncome - prevMonthSummary.totalIncome) /
            prevMonthSummary.totalIncome) *
            100
        );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`৳${thisMonthSummary.totalIncome.toFixed(2)}`}
          variant="primary"
          progress={trendPercent ? Math.max(0, Math.min(100, 50 + trendPercent)) : 50}
          trend={
            trendPercent === null
              ? undefined
              : {
                  label: `${trendPercent > 0 ? "+" : ""}${trendPercent}%`,
                  positive: trendPercent >= 0,
                }
          }
        />
        <StatCard
          title="Outstanding Dues"
          value={`৳${thisMonthSummary.outstandingDues.toFixed(2)}`}
          variant="primary"
          progress={thisMonthSummary.outstandingDues > 0 ? 80 : 0}
        />
        <StatCard title="Open Orders" value={String(openCount)} />
        <StatCard title="Low Stock Items" value={String(lowStockCount)} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <JobCardStatusChart data={statusBreakdown} />
        <RecentJobCardsPanel jobCards={jobCards.slice(0, 5)} />
      </div>
      <TopVehiclesTable vehicles={topVehicles} />
    </div>
  );
}
