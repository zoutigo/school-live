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

  it("has the vie-scolaire tour steps and student help dialog content in both locales", () => {
    const requiredKeys = [
      "onboardingTour.vieScolaire.tabsTitle",
      "onboardingTour.vieScolaire.tabsBody",
      "onboardingTour.vieScolaire.kpisTitle",
      "onboardingTour.vieScolaire.kpisBody",
      "onboardingTour.vieScolaire.helpToggleTitle",
      "onboardingTour.vieScolaire.helpToggleBody",
      "discipline.vieScolaire.help.synthese.title",
      "discipline.vieScolaire.help.synthese.section1Title",
      "discipline.vieScolaire.help.synthese.section1Body",
      "discipline.vieScolaire.help.synthese.section2Title",
      "discipline.vieScolaire.help.synthese.section2Body",
      "discipline.vieScolaire.help.absences.title",
      "discipline.vieScolaire.help.absences.section1Title",
      "discipline.vieScolaire.help.absences.section1Body",
      "discipline.vieScolaire.help.sanctions.title",
      "discipline.vieScolaire.help.sanctions.section1Title",
      "discipline.vieScolaire.help.sanctions.section1Body",
    ];

    for (const key of requiredKeys) {
      expect(translations.fr[key]).toBeTruthy();
      expect(translations.en[key]).toBeTruthy();
    }
  });

  it("has the homework tour steps and student help dialog content in both locales", () => {
    const requiredKeys = [
      "onboardingTour.homework.tabsTitle",
      "onboardingTour.homework.tabsBody",
      "onboardingTour.homework.rowTitle",
      "onboardingTour.homework.rowBody",
      "onboardingTour.homework.markDoneTitle",
      "onboardingTour.homework.markDoneBody",
      "onboardingTour.homework.helpToggleTitle",
      "onboardingTour.homework.helpToggleBody",
      "homework.tourFallback.title",
      "homework.tourFallback.subject",
      "homework.tourFallback.author",
      "homework.studentHelp.toggle",
      "homework.studentHelp.list.title",
      "homework.studentHelp.list.section1Title",
      "homework.studentHelp.list.section1Body",
      "homework.studentHelp.view.title",
      "homework.studentHelp.view.section1Title",
      "homework.studentHelp.view.section1Body",
      "homework.studentHelp.body2",
      "homework.studentHelp.body3",
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

  it("has the teacher-notes tour steps and per-tab help dialog content in both locales", () => {
    const requiredKeys = [
      "onboardingTour.teacherNotes.step1Title",
      "onboardingTour.teacherNotes.step1Body",
      "onboardingTour.teacherNotes.step2Title",
      "onboardingTour.teacherNotes.step2Body",
      "onboardingTour.teacherNotes.step3Title",
      "onboardingTour.teacherNotes.step3Body",
      "onboardingTour.teacherNotes.step4Title",
      "onboardingTour.teacherNotes.step4Body",
      "notes.teacher.pageHelp.evaluations.title",
      "notes.teacher.pageHelp.evaluations.section1Title",
      "notes.teacher.pageHelp.evaluations.section1Body",
      "notes.teacher.pageHelp.evaluations.section2Title",
      "notes.teacher.pageHelp.evaluations.section2Body",
      "notes.teacher.pageHelp.notes.title",
      "notes.teacher.pageHelp.notes.section1Title",
      "notes.teacher.pageHelp.notes.section1Body",
      "notes.teacher.pageHelp.scores.title",
      "notes.teacher.pageHelp.scores.section1Title",
      "notes.teacher.pageHelp.scores.section1Body",
      "notes.teacher.pageHelp.council.title",
      "notes.teacher.pageHelp.council.section1Title",
      "notes.teacher.pageHelp.council.section1Body",
    ];

    for (const key of requiredKeys) {
      expect(translations.fr[key]).toBeTruthy();
      expect(translations.en[key]).toBeTruthy();
    }
  });

  it("has the teacher-discipline tour steps and per-tab help dialog content in both locales", () => {
    const requiredKeys = [
      "onboardingTour.teacherDiscipline.step1Title",
      "onboardingTour.teacherDiscipline.step1Body",
      "onboardingTour.teacherDiscipline.step2Title",
      "onboardingTour.teacherDiscipline.step2Body",
      "onboardingTour.teacherDiscipline.step3Title",
      "onboardingTour.teacherDiscipline.step3Body",
      "discipline.pageHelp.entry.title",
      "discipline.pageHelp.entry.section1Title",
      "discipline.pageHelp.entry.section1Body",
      "discipline.pageHelp.entry.section2Title",
      "discipline.pageHelp.entry.section2Body",
      "discipline.pageHelp.history.title",
      "discipline.pageHelp.history.section1Title",
      "discipline.pageHelp.history.section1Body",
    ];

    for (const key of requiredKeys) {
      expect(translations.fr[key]).toBeTruthy();
      expect(translations.en[key]).toBeTruthy();
    }
  });

  it("has the teacher-home tour steps and help dialog content in both locales", () => {
    const requiredKeys = [
      "onboardingTour.teacherHome.step1Title",
      "onboardingTour.teacherHome.step1Body",
      "onboardingTour.teacherHome.step2Title",
      "onboardingTour.teacherHome.step2Body",
      "onboardingTour.teacherHome.step3Title",
      "onboardingTour.teacherHome.step3Body",
      "dashboard.teacher.help.title",
      "dashboard.teacher.help.section1Title",
      "dashboard.teacher.help.section1Body",
      "dashboard.teacher.help.section2Title",
      "dashboard.teacher.help.section2Body",
    ];

    for (const key of requiredKeys) {
      expect(translations.fr[key]).toBeTruthy();
      expect(translations.en[key]).toBeTruthy();
    }
  });

  it("has the teacher class-agenda tour steps and per-tab help dialog content in both locales", () => {
    const requiredKeys = [
      "onboardingTour.teacherClassAgenda.step1Title",
      "onboardingTour.teacherClassAgenda.step1Body",
      "onboardingTour.teacherClassAgenda.step2Title",
      "onboardingTour.teacherClassAgenda.step2Body",
      "onboardingTour.teacherClassAgenda.step3Title",
      "onboardingTour.teacherClassAgenda.step3Body",
      "onboardingTour.teacherClassAgenda.step4Title",
      "onboardingTour.teacherClassAgenda.step4Body",
      "timetable.agenda.teacherHelp.slots.title",
      "timetable.agenda.teacherHelp.slots.section1Title",
      "timetable.agenda.teacherHelp.slots.section1Body",
      "timetable.agenda.teacherHelp.slots.section2Title",
      "timetable.agenda.teacherHelp.slots.section2Body",
      "timetable.agenda.teacherHelp.slots.section3Title",
      "timetable.agenda.teacherHelp.slots.section3Body",
      "timetable.agenda.teacherHelp.vacations.title",
      "timetable.agenda.teacherHelp.vacations.section1Title",
      "timetable.agenda.teacherHelp.vacations.section1Body",
      "timetable.agenda.teacherHelp.colors.title",
      "timetable.agenda.teacherHelp.colors.section1Title",
      "timetable.agenda.teacherHelp.colors.section1Body",
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
