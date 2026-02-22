import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FamilyFeedPage } from "./family-feed-page";

function setEditorText(container: HTMLElement, value: string) {
  const editor = container.querySelector(
    '[contenteditable="true"]',
  ) as HTMLElement | null;
  if (!editor) {
    throw new Error("Editor not found");
  }
  editor.innerText = value;
  editor.textContent = value;
  fireEvent.input(editor);
}

describe("FamilyFeedPage", () => {
  it("renders featured strip and existing posts", () => {
    render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    expect(screen.getByText("Fil d'actualite famille")).toBeInTheDocument();
    expect(
      screen.getAllByText("Semaine culturelle - programme final").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByLabelText("Publication mise en avant"),
    ).toBeInTheDocument();
  });

  it("allows voting once on a poll", () => {
    render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    const option = screen.getByRole("button", {
      name: /Musee \+ atelier pratique/i,
    });
    fireEvent.click(option);

    expect(option).toBeDisabled();
  });

  it("publishes a new post when required fields are completed", async () => {
    const { container } = render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Publier une info" }));
    const publishButton = screen.getByRole("button", { name: "Publier" });
    expect(publishButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Titre de la publication"), {
      target: { value: "Nouvelle annonce" },
    });
    setEditorText(container, "Contenu publication test");

    expect(publishButton).toBeEnabled();
    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(screen.getByText("Nouvelle annonce")).toBeInTheDocument();
    });
  });

  it("allows author to edit then delete own post", async () => {
    const { container } = render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Publier une info" }));
    fireEvent.change(screen.getByPlaceholderText("Titre de la publication"), {
      target: { value: "Post auteur test" },
    });
    setEditorText(container, "Contenu initial auteur");
    fireEvent.change(
      screen.getByLabelText("Ajouter des pieces jointes a la publication"),
      {
        target: {
          files: [
            new File(["legacy"], "legacy-edit.pdf", {
              type: "application/pdf",
            }),
          ],
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Publier" }));

    await waitFor(() => {
      expect(screen.getByText("Post auteur test")).toBeInTheDocument();
    });
    expect(screen.getByText("legacy-edit.pdf")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Modifier la publication" }),
    );
    const editTitleInput = screen.getByDisplayValue("Post auteur test");
    fireEvent.change(editTitleInput, { target: { value: "Post modifie" } });
    setEditorText(container, "Contenu modifie auteur");
    fireEvent.change(
      screen.getByLabelText("Modifier les pieces jointes de la publication"),
      {
        target: {
          files: [
            new File(["new"], "new-edit.pdf", {
              type: "application/pdf",
            }),
          ],
        },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer legacy-edit.pdf" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(screen.getByText("Post modifie")).toBeInTheDocument();
    });
    expect(screen.getByText("new-edit.pdf")).toBeInTheDocument();
    expect(screen.queryByText("legacy-edit.pdf")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer la publication" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => {
      expect(screen.queryByText("Post modifie")).not.toBeInTheDocument();
    });
  });

  it("filters to my posts only", async () => {
    const { container } = render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Publier une info" }));
    fireEvent.change(screen.getByPlaceholderText("Titre de la publication"), {
      target: { value: "Mon post perso" },
    });
    setEditorText(container, "Contenu perso");
    fireEvent.click(screen.getByRole("button", { name: "Publier" }));

    await waitFor(() => {
      expect(screen.getByText("Mon post perso")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Mes posts" }));

    expect(screen.getByText("Mon post perso")).toBeInTheDocument();
    expect(
      screen.queryByText("Semaine culturelle - programme final"),
    ).not.toBeInTheDocument();
  });
});
