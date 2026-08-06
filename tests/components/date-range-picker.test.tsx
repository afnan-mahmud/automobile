import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.useFakeTimers({ shouldAdvanceTime: true });

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/accounts/dashboard",
}));

import { DateRangePicker } from "@/app/(dashboard)/accounts/dashboard/date-range-picker";

beforeEach(() => {
  push.mockClear();
  vi.setSystemTime(new Date("2026-08-06T09:00:00.000Z"));
});

describe("DateRangePicker", () => {
  it("shows the active range as a human label", () => {
    render(<DateRangePicker range={{ fromDay: "2026-07-01", toDay: "2026-07-31" }} />);

    expect(screen.getByText("1 Jul 2026 — 31 Jul 2026")).toBeInTheDocument();
  });

  it("pushes the resolved range when a preset is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DateRangePicker range={{ fromDay: "2026-07-01", toDay: "2026-07-31" }} />);

    await user.click(screen.getByRole("button", { name: "This month" }));

    expect(push).toHaveBeenCalledWith(
      "/accounts/dashboard?from=2026-08-01&to=2026-08-06"
    );
  });

  it("marks the preset matching the current range as active", () => {
    render(<DateRangePicker range={{ fromDay: "2026-08-01", toDay: "2026-08-06" }} />);

    expect(screen.getByRole("button", { name: "This month" })).toHaveAttribute(
      "data-active",
      "true"
    );
  });
});
