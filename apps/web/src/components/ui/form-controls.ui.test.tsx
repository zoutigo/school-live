import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FormDateTimeInput,
  FormCheckbox,
  FormNumberInput,
  FormSelect,
  FormSubmitHint,
  FormTextInput,
  FormTextarea,
} from "./form-controls";

describe("form controls", () => {
  it("renders native types and invalid styles", () => {
    render(
      <>
        <FormTextInput aria-label="text" invalid />
        <FormNumberInput aria-label="number" invalid />
        <FormDateTimeInput aria-label="datetime" invalid />
        <FormSelect aria-label="select" invalid defaultValue="a">
          <option value="a">A</option>
        </FormSelect>
        <FormTextarea aria-label="textarea" invalid />
        <FormCheckbox aria-label="checkbox" invalid checked readOnly />
      </>,
    );

    expect(screen.getByLabelText("text")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("number")).toHaveAttribute("type", "number");
    expect(screen.getByLabelText("datetime")).toHaveAttribute(
      "type",
      "datetime-local",
    );
    expect(screen.getByLabelText("select").className).toContain(
      "border-notification",
    );
    expect(screen.getByLabelText("textarea").className).toContain(
      "border-notification",
    );
    expect(screen.getByLabelText("checkbox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows the global submit hint only when visible", () => {
    const { rerender } = render(<FormSubmitHint visible={false} />);

    expect(
      screen.queryByText(
        "Vous devez remplir correctement les champs obligatoires.",
      ),
    ).not.toBeInTheDocument();

    rerender(<FormSubmitHint visible />);

    expect(
      screen.getByText(
        "Vous devez remplir correctement les champs obligatoires.",
      ),
    ).toBeInTheDocument();
  });
});
