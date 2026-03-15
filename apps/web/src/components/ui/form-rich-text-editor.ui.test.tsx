import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormRichTextEditor } from "./form-rich-text-editor";

describe("FormRichTextEditor", () => {
  it("renders invalid state and inline error", () => {
    render(
      <FormRichTextEditor
        label="Contenu"
        error="Le contenu est obligatoire."
        invalid
        value="<p>Bonjour</p>"
        onChange={vi.fn()}
        editorTestId="editor"
        allowInlineImages={false}
      />,
    );

    expect(screen.getByText("Contenu")).toBeInTheDocument();
    expect(screen.getByText("Le contenu est obligatoire.")).toBeInTheDocument();
    expect(screen.getByTestId("editor")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByTestId("editor").className).toContain(
      "border-notification",
    );
  });
});
