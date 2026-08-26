import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FamilyFeedPage } from "./family-feed-page";

function getPostCard(title: string) {
  const titleNode = screen.getAllByText(title)[0];
  const article = titleNode.closest("article");
  if (!article) {
    throw new Error(`Post card not found for ${title}`);
  }
  return article;
}

describe("FamilyFeedPage — readOnly (parent viewing a child's class feed)", () => {
  it("hides the composer triggers entirely", () => {
    render(
      <FamilyFeedPage
        schoolSlug="college-vogt"
        childFullName="Lisa MBELE"
        readOnly
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Publier une info" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Realiser un sondage" }),
    ).not.toBeInTheDocument();
  });

  it("disables the like button without hiding the like count", () => {
    render(
      <FamilyFeedPage
        schoolSlug="college-vogt"
        childFullName="Lisa MBELE"
        readOnly
      />,
    );

    const postCard = getPostCard("Semaine culturelle - programme final");
    const likeButton = within(postCard).getByRole("button", {
      name: /Aimer/,
    });
    expect(likeButton).toBeDisabled();

    const likesCountBefore = within(postCard).getByRole("button", {
      name: /Aimer/,
    }).textContent;
    fireEvent.click(likeButton);
    expect(
      within(postCard).getByRole("button", { name: /Aimer/ }).textContent,
    ).toBe(likesCountBefore);
  });

  it("hides the 'Reagir' (comment composer) trigger, so no comment form can ever open", () => {
    render(
      <FamilyFeedPage
        schoolSlug="college-vogt"
        childFullName="Lisa MBELE"
        readOnly
      />,
    );

    const postCard = getPostCard("Semaine culturelle - programme final");
    expect(
      within(postCard).queryByRole("button", { name: /Reagir/i }),
    ).not.toBeInTheDocument();
    expect(
      within(postCard).queryByPlaceholderText(/commentaire/i),
    ).not.toBeInTheDocument();
  });

  it("still allows viewing existing comments (pure consultation stays available)", () => {
    render(
      <FamilyFeedPage
        schoolSlug="college-vogt"
        childFullName="Lisa MBELE"
        readOnly
      />,
    );

    const postCard = getPostCard("Semaine culturelle - programme final");
    const showComments = within(postCard).getByRole("button", {
      name: /Voir les commentaires/,
    });
    fireEvent.click(showComments);
    expect(
      within(postCard).getByText("Merci pour le programme, tres utile."),
    ).toBeInTheDocument();
  });

  it("disables poll voting while still showing results", () => {
    render(
      <FamilyFeedPage
        schoolSlug="college-vogt"
        childFullName="Lisa MBELE"
        readOnly
      />,
    );

    const pollCard = getPostCard("Sondage sortie pedagogique");
    const options = within(pollCard).getAllByRole("button");
    const voteOptions = options.filter((button) =>
      /voix|vote/i.test(button.textContent ?? ""),
    );
    expect(voteOptions.length).toBeGreaterThan(0);
    for (const option of voteOptions) {
      expect(option).toBeDisabled();
    }
  });

  it("never renders edit/delete controls even if the post is manageable", () => {
    render(
      <FamilyFeedPage
        schoolSlug="college-vogt"
        childFullName="Lisa MBELE"
        readOnly
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Modifier la publication" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Supprimer la publication" }),
    ).not.toBeInTheDocument();
  });
});
