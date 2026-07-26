import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requirePageRole } from "@/lib/auth";
import { listAccountTransactions } from "@/actions/accounts";
import { TransactionList } from "./transaction-list";

export default async function AccountsPage() {
  const session = await requirePageRole(["admin", "manager"]);
  const transactions = await listAccountTransactions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Accounts</h2>
        {session.user.role === "admin" && (
          <Link href="/accounts/dashboard" className={buttonVariants({ variant: "outline" })}>
            Finance Dashboard
          </Link>
        )}
      </div>
      <TransactionList initialTransactions={transactions} />
    </div>
  );
}
