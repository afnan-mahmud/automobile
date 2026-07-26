"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AssignDiscountDialog } from "./assign-discount-dialog";

type DiscountCardRow = {
  _id: string;
  customerId: { name: string; phone: string } | null;
  discountPercent: number;
  validFrom: string;
  validTo: string | null;
  active: boolean;
};

function isExpired(card: DiscountCardRow) {
  if (!card.active) return true;
  if (card.validTo && new Date(card.validTo).getTime() < Date.now()) return true;
  return false;
}

export function DiscountCardList({ initialCards }: { initialCards: DiscountCardRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AssignDiscountDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Valid From</TableHead>
            <TableHead>Valid To</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialCards.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No discount cards yet.
              </TableCell>
            </TableRow>
          )}
          {initialCards.map((card) => {
            const expired = isExpired(card);
            return (
              <TableRow key={card._id}>
                <TableCell>{card.customerId?.name ?? "—"}</TableCell>
                <TableCell>{card.discountPercent}%</TableCell>
                <TableCell>{new Date(card.validFrom).toLocaleDateString()}</TableCell>
                <TableCell>
                  {card.validTo ? new Date(card.validTo).toLocaleDateString() : "Indefinite"}
                </TableCell>
                <TableCell>
                  <Badge variant={expired ? "outline" : "secondary"}>
                    {expired ? "Expired" : "Active"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
