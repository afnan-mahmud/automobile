import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Explicit factory mocks (not automock) for the Server Action modules this
// component tree touches (directly and via AssignTaskDialog/
// IssueWarrantyDialog) — automock would still import the real files first to
// read their export shape, and those transitively import next-auth, which
// doesn't resolve cleanly outside a real Next.js build.
vi.mock("@/actions/jobCards", () => ({
  createJobCard: vi.fn(),
  updateJobCardStatus: vi.fn(),
  addTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  addPartsUsed: vi.fn(),
  listJobCards: vi.fn(),
  getJobCardById: vi.fn(),
}));
vi.mock("@/actions/invoices", () => ({
  generateInvoiceFromJobCard: vi.fn(),
}));
vi.mock("@/actions/tracking", () => ({
  createTrackingLink: vi.fn(),
}));
vi.mock("@/actions/warranty", () => ({
  createWarrantyCard: vi.fn(),
}));

import { JobCardDetail } from "@/app/(dashboard)/job-cards/[id]/job-card-detail";

describe("JobCardDetail task list", () => {
  it("renders each task with its description and status badge", () => {
    const jobCard = {
      _id: "jc1",
      status: "in_progress" as const,
      tasks: [
        {
          _id: "t1",
          description: "Change engine oil",
          status: "completed" as const,
          assignedTo: { _id: "e1", name: "Karim" },
          assignedDate: new Date().toISOString(),
          completedDate: new Date().toISOString(),
          carriedForwardFromDate: null,
        },
        {
          _id: "t2",
          description: "Check brakes",
          status: "pending" as const,
          assignedTo: { _id: "e2", name: "Rahim" },
          assignedDate: new Date().toISOString(),
          completedDate: null,
          carriedForwardFromDate: null,
        },
      ],
      photos: [],
      partsUsed: [],
    };

    render(
      <JobCardDetail
        jobCard={jobCard}
        session={{ role: "technician", employeeId: null }}
        employees={[]}
        products={[]}
        warrantyCard={null}
      />
    );

    expect(screen.getByText("Change engine oil")).toBeInTheDocument();
    expect(screen.getByText("Check brakes")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
