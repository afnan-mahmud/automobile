"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { searchCustomers } from "@/actions/customers";

type CustomerRow = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
};

export function CustomerSearchList({
  initialCustomers,
}: {
  initialCustomers: CustomerRow[];
}) {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      startTransition(async () => {
        const results = await searchCustomers(query);
        setCustomers(results as CustomerRow[]);
      });
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name or phone..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 && !isPending && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No customers found.
              </TableCell>
            </TableRow>
          )}
          {customers.map((customer) => (
            <TableRow key={customer._id}>
              <TableCell>
                <Link
                  href={`/customers/${customer._id}`}
                  className="font-medium hover:underline"
                >
                  {customer.name}
                </Link>
              </TableCell>
              <TableCell>{customer.phone}</TableCell>
              <TableCell>{customer.email || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
