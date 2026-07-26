import { connectToDatabase } from "@/lib/db";
import { JobCard } from "@/models/JobCard";
import { SystemSetting } from "@/models/SystemSetting";

const LAST_RUN_KEY = "taskCarryForward.lastRunDate";

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Scans every job card for tasks still pending/in_progress past their
 * assignedDate, marks the original carried_forward, and appends a fresh
 * pending task dated today with the same description/assignee.
 *
 * Wiring: this is invoked lazily (see listJobCards in actions/jobCards.ts
 * and the dashboard page) rather than on a real cron, because the VPS this
 * app deploys to (Phase 14) has no background-worker infrastructure by
 * default — a lazy check piggybacking on normal page loads needs nothing
 * extra to operate. A `system-settings` document tracks the last run date
 * so it only does the scan once per calendar day no matter how many
 * requests land. To swap in a real cron later: keep this function as-is,
 * drop the lastRunDate guard (or leave it as a safety net), and invoke it
 * from either `node-cron` inside the Next.js process or a system crontab
 * hitting a small dedicated Route Handler once daily.
 */
export async function carryForwardOverdueTasks(): Promise<{
  ranToday: boolean;
  carriedCount: number;
}> {
  await connectToDatabase();
  const today = startOfDay(new Date());

  const setting = await SystemSetting.findOne({ key: LAST_RUN_KEY }).lean();
  if (setting?.value && startOfDay(new Date(setting.value as string)).getTime() === today.getTime()) {
    return { ranToday: false, carriedCount: 0 };
  }

  const jobCards = await JobCard.find({
    tasks: {
      $elemMatch: {
        status: { $in: ["pending", "in_progress"] },
        assignedDate: { $lt: today },
      },
    },
  });

  let carriedCount = 0;

  for (const jobCard of jobCards) {
    const additions: {
      description: string;
      assignedTo: unknown;
      status: "pending";
      assignedDate: Date;
      carriedForwardFromDate: Date;
    }[] = [];

    for (const task of jobCard.tasks) {
      if (
        ["pending", "in_progress"].includes(task.status) &&
        task.assignedDate.getTime() < today.getTime()
      ) {
        const originalDate = task.assignedDate;
        task.status = "carried_forward";
        additions.push({
          description: task.description,
          assignedTo: task.assignedTo,
          status: "pending",
          assignedDate: today,
          carriedForwardFromDate: originalDate,
        });
        carriedCount += 1;
      }
    }

    if (additions.length > 0) {
      jobCard.tasks.push(...additions);
      await jobCard.save();
    }
  }

  await SystemSetting.findOneAndUpdate(
    { key: LAST_RUN_KEY },
    { value: today },
    { upsert: true }
  );

  return { ranToday: true, carriedCount };
}
