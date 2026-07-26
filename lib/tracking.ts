import { connectToDatabase } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { TrackingLink } from "@/models/TrackingLink";
import { JobCard } from "@/models/JobCard";
import { WarrantyCard } from "@/models/WarrantyCard";
import "@/models/Vehicle";

export async function getTrackingSummary(token: string) {
  await connectToDatabase();

  const link = await TrackingLink.findOne({ token }).lean();
  if (!link) {
    return null;
  }
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    return null;
  }

  const jobCard = await JobCard.findById(link.jobCardId)
    .populate("vehicleId", "registrationNumber make model")
    .lean();
  if (!jobCard) {
    return null;
  }

  const total = jobCard.tasks.length;
  const completed = jobCard.tasks.filter(
    (t: { status: string }) => t.status === "completed"
  ).length;
  const percentComplete = total === 0 ? 0 : Math.round((completed / total) * 100);

  const warrantyCard = await WarrantyCard.findOne({ jobCardId: jobCard._id })
    .select("cardNumber startDate endDate")
    .lean();

  return serialize({
    jobCardNumber: jobCard.jobCardNumber,
    status: jobCard.status,
    vehicle: jobCard.vehicleId,
    tasks: jobCard.tasks.map((t: {
      description: string;
      status: string;
      assignedDate: Date;
      completedDate: Date | null;
    }) => ({
      description: t.description,
      status: t.status,
      assignedDate: t.assignedDate,
      completedDate: t.completedDate,
    })),
    percentComplete,
    lastUpdated: jobCard.updatedAt,
    warrantyCard: warrantyCard
      ? {
          id: warrantyCard._id,
          cardNumber: warrantyCard.cardNumber,
          startDate: warrantyCard.startDate,
          endDate: warrantyCard.endDate,
        }
      : null,
  });
}
