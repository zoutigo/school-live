import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FamilyFeedPage } from "./family-feed-page";
import {
  assertNoHorizontalOverflowAt320,
  setViewportWidth,
} from "../../test/responsive";

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

function getPostCard(title: string) {
  const titleNode = screen.getAllByText(title)[0];
  const article = titleNode.closest("article");
  if (!article) {
    throw new Error(`Post card not found for ${title}`);
  }
  return article;
}

describe("FamilyFeedPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("does not render the audience badge on feed cards", () => {
    render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    const postCard = getPostCard("Semaine culturelle - programme final");
    expect(within(postCard).queryByText("Toute l'ecole")).not.toBeInTheDocument();
  });

  it("allows voting once on a poll", () => {
    render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    const pollCard = getPostCard("Sondage sortie pedagogique");
    const option = within(pollCard).getByRole("button", {
      name: /Musee \+ atelier pratique/i,
    });
    fireEvent.click(option);

    return waitFor(() => {
      expect(option).toBeDisabled();
    });
  });

  it("persists a poll vote through the backend when available", async () => {
    document.cookie = "school_live_csrf_token=csrf-token";
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("list unavailable"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          votedOptionId: "p1",
          options: [
            { id: "p1", label: "Musee + atelier pratique", votes: 17 },
            { id: "p2", label: "Visite entreprise locale", votes: 9 },
            { id: "p3", label: "Journee sportive inter-classes", votes: 11 },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    const pollCard = getPostCard("Sondage sortie pedagogique");
    const option = within(pollCard).getByRole("button", {
      name: /Musee \+ atelier pratique/i,
    });
    fireEvent.click(option);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) => {
          const [url, options] = call as [string, RequestInit];
          return (
            typeof url === "string" &&
            url.includes("/schools/college-vogt/feed/") &&
            options?.method === "POST"
          );
        }),
      ).toBe(true);
    });
    await waitFor(() => {
      expect(option).toBeDisabled();
    });
    expect(
      screen.queryByText("Vote local uniquement (API indisponible)."),
    ).not.toBeInTheDocument();
  });

  it("falls back locally when poll vote api is unavailable", async () => {
    document.cookie = "school_live_csrf_token=csrf-token";
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("list unavailable"))
      .mockRejectedValueOnce(new Error("vote unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    const pollCard = getPostCard("Sondage sortie pedagogique");
    const option = within(pollCard).getByRole("button", {
      name: /Musee \+ atelier pratique/i,
    });
    fireEvent.click(option);

    await waitFor(() => {
      expect(option).toBeDisabled();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("allows liking a post", () => {
    render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    const postCard = getPostCard("Semaine culturelle - programme final");
    const likeButton = within(postCard).getByRole("button", {
      name: /Aimer \(/i,
    });
    fireEvent.click(likeButton);

    return waitFor(() => {
      const updatedCard = getPostCard("Semaine culturelle - programme final");
      expect(
        within(updatedCard).getByRole("button", {
          name: /Retirer le like \(/i,
        }),
      ).toBeInTheDocument();
    });
  });

  it("allows opening comments and posting a reaction", async () => {
    render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    const postCard = getPostCard("Semaine culturelle - programme final");
    fireEvent.click(within(postCard).getByRole("button", { name: /Reagir/i }));
    fireEvent.change(
      within(postCard).getByPlaceholderText("Ajouter un commentaire..."),
      {
        target: { value: "Merci pour cette mise a jour" },
      },
    );
    fireEvent.click(within(postCard).getByRole("button", { name: "Commenter" }));

    await waitFor(() => {
      expect(
        within(postCard).getByText("Merci pour cette mise a jour"),
      ).toBeInTheDocument();
    });
  });

  it("shows existing feed attachments on a post", () => {
    render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    const postCard = getPostCard("Semaine culturelle - programme final");
    expect(
      within(postCard).getByText("Programme-semaine-culturelle.pdf"),
    ).toBeInTheDocument();
  });

  it("allows viewing and adding comments from the comments panel", async () => {
    render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    const postCard = getPostCard("Semaine culturelle - programme final");
    fireEvent.click(
      within(postCard).getByRole("button", {
        name: /Voir les commentaires \(/i,
      }),
    );

    expect(
      within(postCard).getByText("Merci pour le programme, tres utile."),
    ).toBeInTheDocument();

    fireEvent.click(within(postCard).getByRole("button", { name: /Reagir/i }));
    fireEvent.change(
      within(postCard).getByPlaceholderText("Ajouter un commentaire..."),
      {
        target: { value: "Merci pour cette mise a jour" },
      },
    );
    fireEvent.click(within(postCard).getByRole("button", { name: "Commenter" }));

    await waitFor(() => {
      expect(
        within(postCard).getByText("Merci pour cette mise a jour"),
      ).toBeInTheDocument();
    });
  });

  it("publishes a poll with an attachment", async () => {
    const { container } = render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Realiser un sondage" }));
    fireEvent.change(screen.getByPlaceholderText("Titre du sondage"), {
      target: { value: "Sondage transport" },
    });
    setEditorText(container, "Merci de choisir un horaire.");
    fireEvent.change(screen.getByPlaceholderText("Question du sondage"), {
      target: { value: "Quel horaire vous convient ?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option 1"), {
      target: { value: "07:30" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option 2"), {
      target: { value: "08:00" },
    });
    fireEvent.change(
      screen.getByLabelText("Ajouter des pieces jointes a la publication"),
      {
        target: {
          files: [
            new File(["pdf"], "transport.pdf", {
              type: "application/pdf",
            }),
          ],
        },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "Publier" }));

    await waitFor(() => {
      expect(screen.getAllByText("Sondage transport")[0]).toBeInTheDocument();
    });
    const postCard = getPostCard("Sondage transport");
    expect(within(postCard).getByText("transport.pdf")).toBeInTheDocument();
    expect(
      within(postCard).getByText("Quel horaire vous convient ?"),
    ).toBeInTheDocument();
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
      expect(screen.getAllByText("Nouvelle annonce")[0]).toBeInTheDocument();
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
      expect(screen.getAllByText("Post auteur test")[0]).toBeInTheDocument();
    });

    let postCard = getPostCard("Post auteur test");
    expect(within(postCard).getByText("legacy-edit.pdf")).toBeInTheDocument();

    fireEvent.click(
      within(postCard).getByRole("button", { name: "Modifier la publication" }),
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
      expect(screen.getAllByText("Post modifie")[0]).toBeInTheDocument();
    });
    postCard = getPostCard("Post modifie");
    expect(within(postCard).getByText("new-edit.pdf")).toBeInTheDocument();
    expect(within(postCard).queryByText("legacy-edit.pdf")).not.toBeInTheDocument();

    fireEvent.click(
      within(postCard).getByRole("button", { name: "Supprimer la publication" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => {
      expect(screen.queryByText("Post modifie")).not.toBeInTheDocument();
    });
  }, 10000);

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
      expect(screen.getAllByText("Mon post perso")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Mes posts" }));

    expect(screen.getByText("Mon post perso")).toBeInTheDocument();
    expect(
      screen.queryByText("Semaine culturelle - programme final"),
    ).not.toBeInTheDocument();
  });

  it("keeps the feed header usable on smartphone", () => {
    setViewportWidth(320);

    render(
      <FamilyFeedPage schoolSlug="college-vogt" childFullName="Lisa MBELE" />,
    );

    expect(screen.getByTestId("family-feed-header")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Publier une info" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Realiser un sondage" }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Rechercher dans le fil..."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("family-feed-toolbar").className).toContain(
      "grid",
    );
    assertNoHorizontalOverflowAt320(screen.getByTestId("family-feed-header"));
  });
});
