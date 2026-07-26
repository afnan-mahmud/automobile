import { notFound } from "next/navigation";
import { getTrackingSummary } from "@/lib/tracking";
import { TrackingView } from "./tracking-view";

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const summary = await getTrackingSummary(token);
  if (!summary) {
    notFound();
  }

  return (
    <div className="light min-h-screen bg-slate-50 text-slate-900">
      <TrackingView token={token} initialData={summary} />
    </div>
  );
}
