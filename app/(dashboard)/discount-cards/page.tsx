import { requirePageRole } from "@/lib/auth";
import { listDiscountCards, getDiscountCardUsageMap } from "@/actions/discountCards";
import { DiscountCardList } from "./discount-card-list";

export default async function DiscountCardsPage() {
  await requirePageRole(["admin", "manager"]);
  const cards = await listDiscountCards();

  // One aggregate for every card on the page — never one query per card.
  const usage = await getDiscountCardUsageMap(
    cards.map((c: { _id: string }) => c._id.toString())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Discount Cards</h2>
      <DiscountCardList initialCards={cards} usage={usage} />
    </div>
  );
}
