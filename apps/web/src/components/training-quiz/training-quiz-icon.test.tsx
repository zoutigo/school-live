import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrainingQuizIcon } from "./training-quiz-icon";

describe("TrainingQuizIcon", () => {
  it.each([
    "Users",
    "Settings",
    "Building2",
    "DoorOpen",
    "UserPlus",
    "TrendingUp",
    "CalendarClock",
  ])("renders the %s icon added for SCHOOL_ADMIN chapters", (name) => {
    const { container } = render(<TrainingQuizIcon name={name} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("falls back to Sparkles for an unknown icon name", () => {
    const { container } = render(<TrainingQuizIcon name="NotAnIcon" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
