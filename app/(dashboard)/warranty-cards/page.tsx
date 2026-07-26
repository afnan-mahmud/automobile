import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePageRole } from "@/lib/auth";
import { listWarrantyCards } from "@/actions/warranty";

export default async function WarrantyCardsPage() {
  await requirePageRole(["admin", "manager"]);
  const cards = await listWarrantyCards();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Warranty Cards</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Card #</TableHead>
            <TableHead>Job Card</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Valid</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No warranty cards issued yet.
              </TableCell>
            </TableRow>
          )}
          {cards.map(
            (card: {
              _id: string;
              cardNumber: string;
              jobCardId: { jobCardNumber: string } | null;
              customerId: { name: string } | null;
              startDate: string;
              endDate: string;
            }) => (
              <TableRow key={card._id}>
                <TableCell className="font-medium">{card.cardNumber}</TableCell>
                <TableCell>{card.jobCardId?.jobCardNumber ?? "—"}</TableCell>
                <TableCell>{card.customerId?.name ?? "—"}</TableCell>
                <TableCell>
                  {new Date(card.startDate).toLocaleDateString()} —{" "}
                  {new Date(card.endDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <a
                    href={`/api/warranty/${card._id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium hover:underline"
                  >
                    View PDF
                  </a>
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </div>
  );
}
