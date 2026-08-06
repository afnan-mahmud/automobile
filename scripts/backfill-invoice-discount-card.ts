/**
 * One-time backfill: link historical invoices to the discount card that
 * produced their discount.
 *
 * Invoices created before Invoice.discountCardId existed only recorded a
 * percentage, so usage history is invisible until this runs.
 *
 * Matching is deliberately conservative — an invoice is only linked when
 * exactly one of the customer's cards fits. Two plausible cards means we do
 * not know, so it is reported for a human instead of guessed at.
 *
 * Usage:
 *   npx tsx scripts/backfill-invoice-discount-card.ts           # dry run
 *   npx tsx scripts/backfill-invoice-discount-card.ts --apply   # writes
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db";
import { Invoice } from "../models/Invoice";
import { DiscountCard } from "../models/DiscountCard";

type CardLike = {
  _id: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  discountPercent: number;
  validFrom: Date;
  validTo: Date | null;
};

type InvoiceLike = {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  customerId: mongoose.Types.ObjectId;
  discountPercent: number;
  createdAt: Date;
};

export type MatchResult =
  | { status: "linked"; cardId: string }
  | { status: "no_match" }
  | { status: "ambiguous"; candidates: string[] };

export function matchDiscountCardForInvoice(
  invoice: InvoiceLike,
  cards: CardLike[]
): MatchResult {
  const at = invoice.createdAt.getTime();

  const candidates = cards.filter((card) => {
    if (card.customerId.toString() !== invoice.customerId.toString()) return false;
    if (card.discountPercent !== invoice.discountPercent) return false;
    if (card.validFrom.getTime() > at) return false;
    if (card.validTo && card.validTo.getTime() < at) return false;
    return true;
  });

  if (candidates.length === 0) return { status: "no_match" };
  if (candidates.length === 1) {
    return { status: "linked", cardId: candidates[0]._id.toString() };
  }
  return {
    status: "ambiguous",
    candidates: candidates.map((c) => c._id.toString()),
  };
}

export type BackfillReport = {
  linked: number;
  noMatch: string[];
  ambiguous: string[];
};

/**
 * Does the whole DB pass and returns a report. Never prints, never exits —
 * that keeps it callable from tests, including a test that proves dry-run
 * mode writes nothing.
 */
export async function runBackfill({ apply }: { apply: boolean }): Promise<BackfillReport> {
  await connectToDatabase();

  const invoices = (await Invoice.find({
    discountPercent: { $gt: 0 },
    $or: [{ discountCardId: null }, { discountCardId: { $exists: false } }],
  }).lean()) as unknown as InvoiceLike[];

  const cards = (await DiscountCard.find({}).lean()) as unknown as CardLike[];
  const cardsByCustomer = new Map<string, CardLike[]>();
  for (const card of cards) {
    const key = card.customerId.toString();
    if (!cardsByCustomer.has(key)) cardsByCustomer.set(key, []);
    cardsByCustomer.get(key)!.push(card);
  }

  const report: BackfillReport = { linked: 0, noMatch: [], ambiguous: [] };

  for (const invoice of invoices) {
    const result = matchDiscountCardForInvoice(
      invoice,
      cardsByCustomer.get(invoice.customerId.toString()) ?? []
    );

    if (result.status === "linked") {
      if (apply) {
        await Invoice.updateOne(
          { _id: invoice._id },
          { $set: { discountCardId: new mongoose.Types.ObjectId(result.cardId) } }
        );
      }
      report.linked++;
    } else if (result.status === "no_match") {
      report.noMatch.push(invoice.invoiceNumber);
    } else {
      report.ambiguous.push(
        `${invoice.invoiceNumber} (candidates: ${result.candidates.join(", ")})`
      );
    }
  }

  return report;
}

async function main() {
  const apply = process.argv.includes("--apply");

  console.log(`Mode: ${apply ? "APPLY (writes)" : "DRY RUN (no writes)"}`);

  const report = await runBackfill({ apply });

  console.log("");
  console.log(`Linked:    ${report.linked}${apply ? "" : " (would link)"}`);
  console.log(`No match:  ${report.noMatch.length}`);
  console.log(`Ambiguous: ${report.ambiguous.length}`);

  if (report.noMatch.length > 0) {
    console.log("\nSkipped — no matching card:");
    for (const num of report.noMatch) console.log(`  ${num}`);
  }
  if (report.ambiguous.length > 0) {
    console.log("\nSkipped — more than one card fits, resolve by hand:");
    for (const line of report.ambiguous) console.log(`  ${line}`);
  }

  if (!apply) {
    console.log("\nNothing was written. Re-run with --apply to commit these links.");
  }

  process.exit(0);
}

// Only run the migration when executed directly, so importing runBackfill or
// the matcher in tests does not kick off a migration or call process.exit.
if (process.argv[1] && process.argv[1].includes("backfill-invoice-discount-card")) {
  main().catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
}
