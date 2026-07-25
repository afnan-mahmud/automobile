import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePageRole } from "@/lib/auth";
import { getCustomerWithVehicles } from "@/actions/customers";
import { AddVehicleDialog } from "./add-vehicle-dialog";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(["admin", "manager"]);
  const { id } = await params;

  const result = await getCustomerWithVehicles(id);
  if (!result) {
    notFound();
  }

  const { customer, vehicles } = result;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{customer.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Phone: {customer.phone}</p>
          {customer.email && <p>Email: {customer.email}</p>}
          {customer.address && <p>Address: {customer.address}</p>}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Vehicles</h3>
          <AddVehicleDialog customerId={id} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registration</TableHead>
              <TableHead>Make</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Color</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No vehicles added yet.
                </TableCell>
              </TableRow>
            )}
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle._id}>
                <TableCell className="font-medium">
                  {vehicle.registrationNumber}
                </TableCell>
                <TableCell>{vehicle.make || "—"}</TableCell>
                <TableCell>{vehicle.model || "—"}</TableCell>
                <TableCell>{vehicle.year || "—"}</TableCell>
                <TableCell>{vehicle.color || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
