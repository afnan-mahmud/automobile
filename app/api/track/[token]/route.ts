import { NextResponse } from "next/server";
import { getTrackingSummary } from "@/lib/tracking";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const summary = await getTrackingSummary(token);

  if (!summary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(summary);
}
