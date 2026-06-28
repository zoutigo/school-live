import React, { createRef } from "react";
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

  it("forwards ref to the underlying date input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<DateInput aria-label="date-ref" ref={ref} value="" readOnly />);
    expect(ref.current).toBe(screen.getByLabelText("date-ref"));
  });

  it("forwards ref to the underlying time input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TimeInput aria-label="time-ref" ref={ref} value="" readOnly />);
    expect(ref.current).toBe(screen.getByLabelText("time-ref"));
  });

  it("supports invalid visual state on the time input", () => {
    render(<TimeInput aria-label="time-invalid" invalid value="" readOnly />);

    const input = screen.getByLabelText("time-invalid");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.className).toContain("border-notification");
  });
});
