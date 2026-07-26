import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { JobCard, PHOTO_TYPES } from "@/models/JobCard";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "job-cards");

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !["admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const jobCardId = formData.get("jobCardId");
  const type = formData.get("type");
  const caption = formData.get("caption");

  if (!(file instanceof File) || typeof jobCardId !== "string" || !jobCardId) {
    return NextResponse.json(
      { error: "A file and jobCardId are required" },
      { status: 400 }
    );
  }

  if (typeof type !== "string" || !PHOTO_TYPES.includes(type as (typeof PHOTO_TYPES)[number])) {
    return NextResponse.json(
      { error: "type must be 'before' or 'after'" },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File exceeds the 5MB limit" },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const jobCard = await JobCard.findById(jobCardId);
  if (!jobCard) {
    return NextResponse.json({ error: "Job card not found" }, { status: 404 });
  }

  const dir = path.join(UPLOAD_ROOT, jobCardId);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name).toLowerCase() || "";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const url = `/uploads/job-cards/${jobCardId}/${filename}`;
  const photo = {
    url,
    type: type as (typeof PHOTO_TYPES)[number],
    caption: typeof caption === "string" && caption ? caption : undefined,
  };

  jobCard.photos.push(photo);
  await jobCard.save();

  return NextResponse.json({ photo });
}
