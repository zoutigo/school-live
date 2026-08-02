import { describe, expect, it } from "vitest";
import { translations } from "./translations";

describe("onboardingTour.* translations", () => {
  it("has matching, non-empty fr/en keys", () => {
    const frKeys = Object.keys(translations.fr).filter((key) =>
      key.startsWith("onboardingTour."),
    );
    const enKeys = Object.keys(translations.en).filter((key) =>
      key.startsWith("onboardingTour."),
    );

    expect(frKeys.length).toBeGreaterThan(0);
    expect(new Set(enKeys)).toEqual(new Set(frKeys));

    for (const key of frKeys) {
      expect(translations.fr[key]).not.toBe("");
      expect(translations.en[key]).not.toBe("");
    }
  });

  it("has the child-timetable pilot tour steps in both locales", () => {
    const requiredKeys = [
      "onboardingTour.common.next",
      "onboardingTour.common.finish",
      "onboardingTour.childTimetable.controlsTitle",
      "onboardingTour.childTimetable.controlsBody",
      "onboardingTour.childTimetable.dayListTitle",
      "onboardingTour.childTimetable.dayListBody",
      "onboardingTour.childTimetable.helpBlockTitle",
      "onboardingTour.childTimetable.helpBlockBody",
    ];

    for (const key of requiredKeys) {
      expect(translations.fr[key]).toBeTruthy();
      expect(translations.en[key]).toBeTruthy();
    }
  });

  it("has the parent-landing tour steps in both locales", () => {
    const requiredKeys = [
      "onboardingTour.parentLanding.step1Title",
      "onboardingTour.parentLanding.step1Body",
      "onboardingTour.parentLanding.step2Title",
      "onboardingTour.parentLanding.step2Body",
      "onboardingTour.parentLanding.step3Title",
      "onboardingTour.parentLanding.step3Body",
      "onboardingTour.parentLanding.step4Title",
      "onboardingTour.parentLanding.step4Body",
      "onboardingTour.parentLanding.step5Title",
      "onboardingTour.parentLanding.step5Body",
    ];

    for (const key of requiredKeys) {
      expect(translations.fr[key]).toBeTruthy();
      expect(translations.en[key]).toBeTruthy();
    }
  });

  it("has the parent dashboard help dialog content in both locales", () => {
    const requiredKeys = [
      "dashboard.parent.help.toggle",
      "dashboard.parent.help.title",
      "dashboard.parent.help.body1",
      "dashboard.parent.help.body2",
      "dashboard.parent.help.body3",
    ];

    for (const key of requiredKeys) {
      expect(translations.fr[key]).toBeTruthy();
      expect(translations.en[key]).toBeTruthy();
    }
  });
});

describe("settings.onboardingHelp.* translations", () => {
  it("has matching, non-empty fr/en keys", () => {
    const frKeys = Object.keys(translations.fr).filter((key) =>
      key.startsWith("settings.onboardingHelp."),
    );
    const enKeys = Object.keys(translations.en).filter((key) =>
      key.startsWith("settings.onboardingHelp."),
    );

    expect(frKeys.length).toBeGreaterThan(0);
    expect(new Set(enKeys)).toEqual(new Set(frKeys));

    for (const key of frKeys) {
      expect(translations.fr[key]).not.toBe("");
      expect(translations.en[key]).not.toBe("");
    }
  });
});
