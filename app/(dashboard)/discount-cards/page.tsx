import { requirePageRole } from "@/lib/auth";
import { listDiscountCards } from "@/actions/discountCards";
import { DiscountCardList } from "./discount-card-list";

export default async function DiscountCardsPage() {
  await requirePageRole(["admin", "manager"]);
  const cards = await listDiscountCards();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Discount Cards</h2>
      <DiscountCardList initialCards={cards} />
    </div>
  );
}
