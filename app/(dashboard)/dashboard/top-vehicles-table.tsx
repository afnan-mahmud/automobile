import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VehicleRow = {
  vehicleId: string;
  registrationNumber: string;
  customerName: string;
  jobCardCount: number;
  lastServiceDate: string;
  lifetimeSpend: number;
};

export function TopVehiclesTable({ vehicles }: { vehicles: VehicleRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Serviced Vehicles</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Job Cards</TableHead>
              <TableHead>Last Service</TableHead>
              <TableHead>Lifetime Spend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No service history yet.
                </TableCell>
              </TableRow>
            )}
            {vehicles.map((v) => (
              <TableRow key={v.vehicleId}>
                <TableCell className="font-medium">{v.registrationNumber}</TableCell>
                <TableCell>{v.customerName}</TableCell>
                <TableCell>{v.jobCardCount}</TableCell>
                <TableCell>{new Date(v.lastServiceDate).toLocaleDateString()}</TableCell>
                <TableCell>৳{v.lifetimeSpend.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
