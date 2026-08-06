import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Calendar } from "@/components/ui/calendar";

describe("Calendar", () => {
  it("renders two months side by side starting at the selected month", () => {
    render(
      <Calendar
        selected={{ from: new Date(2026, 6, 1), to: new Date(2026, 6, 31) }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/July 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/August 2026/i)).toBeInTheDocument();
  });

  it("reports the clicked day through onSelect", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <Calendar
        selected={{ from: new Date(2026, 6, 1), to: new Date(2026, 6, 1) }}
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByRole("button", { name: /July 15/i }));

    expect(onSelect).toHaveBeenCalled();
  });
});
