import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SuccessRedirectToast } from "./success-redirect-toast";

describe("SuccessRedirectToast", () => {
  it("shows a countdown and calls onComplete after the configured delay", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    render(
      <SuccessRedirectToast
        open
        title="Operation terminee"
        description="Votre action a bien ete prise en compte."
        durationSeconds={5}
        onComplete={onComplete}
      />,
    );

    expect(screen.getByTestId("success-redirect-toast")).toHaveTextContent(
      "5s",
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId("success-redirect-toast")).toHaveTextContent(
      "3s",
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
