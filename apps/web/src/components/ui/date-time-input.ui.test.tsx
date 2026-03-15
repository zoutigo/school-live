import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DateInput } from "./date-input";
import { TimeInput } from "./time-input";

describe("DateInput and TimeInput", () => {
  it("renders date and time native input types", () => {
    render(
      <>
        <DateInput aria-label="date-test" value="2026-03-08" readOnly />
        <TimeInput aria-label="time-test" value="09:30" readOnly />
      </>,
    );

    expect(screen.getByLabelText("date-test")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("time-test")).toHaveAttribute("type", "time");
  });

  it("supports invalid visual state on the date input", () => {
    render(<DateInput aria-label="date-invalid" invalid value="" readOnly />);

    const input = screen.getByLabelText("date-invalid");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.className).toContain("border-notification");
  });
});
