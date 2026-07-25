import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requirePageRole } from "@/lib/auth";
import { searchCustomers } from "@/actions/customers";
import { CustomerSearchList } from "./customer-search-list";

export default async function CustomersPage() {
  await requirePageRole(["admin", "manager"]);
  const customers = await searchCustomers("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Customers</h2>
        <Link href="/customers/new" className={buttonVariants()}>
          Add Customer
        </Link>
      </div>
      <CustomerSearchList initialCustomers={customers} />
    </div>
  );
}
