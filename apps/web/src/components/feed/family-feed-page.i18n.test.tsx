import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FamilyFeedPage } from "./family-feed-page";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";

describe("FamilyFeedPage i18n", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  afterEach(() => {
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("renders the header, search and filters in French by default", () => {
    render(
      <FamilyFeedPage
        schoolSlug="college-vogt"
        childFullName="Lisa MBELE"
        scopeLabel="la vie scolaire"
      />,
    );

    expect(screen.getByText("Fil d'actualite famille")).toBeInTheDocument();
    expect(
      screen.getByText("Bonjour, suivez la vie scolaire de Lisa MBELE"),
    ).toBeInTheDocument();
    expect(screen.getByText("Publier une info")).toBeInTheDocument();
    expect(screen.getByText("Realiser un sondage")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Rechercher dans le fil..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tous" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "A la une" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sondages" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mes posts" }),
    ).toBeInTheDocument();
  });

  it("renders the header, search and filters in English when locale=en", () => {
    useLocaleStore.setState({ locale: "en" });

    render(
      <FamilyFeedPage
        schoolSlug="college-vogt"
        childFullName="Lisa MBELE"
        scopeLabel="school life"
      />,
    );

    expect(screen.getByText("Family news feed")).toBeInTheDocument();
    expect(
      screen.getByText("Hello, follow school life for Lisa MBELE"),
    ).toBeInTheDocument();
    expect(screen.getByText("Post an update")).toBeInTheDocument();
    expect(screen.getByText("Create a poll")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search the feed..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Featured" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Polls" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "My posts" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Fil d'actualite famille"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Publier une info")).not.toBeInTheDocument();
  });

  it("translates the staff view filters to English", () => {
    useLocaleStore.setState({ locale: "en" });

    render(
      <FamilyFeedPage
        schoolSlug="college-vogt"
        childFullName="College Vogt"
        scopeLabel="school life"
        viewerRole="TEACHER"
        viewScope="GENERAL"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Staff" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Parents/students" }),
    ).toBeInTheDocument();
  });

  it("translates the end-of-feed pagination message to English", () => {
    useLocaleStore.setState({ locale: "en" });

    render(
      <FamilyFeedPage
        schoolSlug="college-vogt"
        childFullName="Lisa MBELE"
        scopeLabel="school life"
        viewScope="CLASS"
        currentClassId="class-6ec"
        useDemoSeed={false}
      />,
    );

    expect(screen.getByText("End of feed")).toBeInTheDocument();
  });
});
