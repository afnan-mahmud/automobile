import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { TrackingView } from "@/app/track/[token]/tracking-view";

describe("TrackingView polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls the tracking API every 10 seconds and re-renders progress", async () => {
    const initialData = {
      jobCardNumber: "JC-000001",
      status: "in_progress" as const,
      vehicle: { registrationNumber: "DHA-1234" },
      tasks: [
        {
          description: "Oil change",
          status: "pending" as const,
          assignedDate: new Date().toISOString(),
          completedDate: null,
        },
      ],
      percentComplete: 0,
      lastUpdated: new Date().toISOString(),
      warrantyCard: null,
    };

    const updatedData = {
      ...initialData,
      percentComplete: 100,
      tasks: [{ ...initialData.tasks[0], status: "completed" as const }],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => updatedData,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TrackingView token="abc123" initialData={initialData} />);

    expect(screen.getByText("0% complete")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(screen.getByText("100% complete")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/track/abc123", { cache: "no-store" });
  });
});
