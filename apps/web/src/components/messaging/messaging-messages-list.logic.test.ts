import { describe, expect, it } from "vitest";
import {
  formatSenderForList,
  getSubjectClass,
  shouldShowPreview,
} from "./messaging-messages-list.logic";

describe("formatSenderForList", () => {
  it("formats LASTNAME Firstname as initial dot lastname uppercase", () => {
    expect(formatSenderForList("MBELE Valery")).toBe("V.MBELE");
  });

  it("formats Firstname LASTNAME as initial dot lastname uppercase", () => {
    expect(formatSenderForList("Valery MBELE")).toBe("V.MBELE");
  });

  it("uppercases single token sender", () => {
    expect(formatSenderForList("Moi")).toBe("MOI");
  });
});

describe("getSubjectClass", () => {
  it("returns unread class with primary and bold", () => {
    expect(getSubjectClass(true)).toBe(
      "line-clamp-1 text-sm font-semibold text-primary",
    );
  });

  it("returns read class without primary and without bold", () => {
    expect(getSubjectClass(false)).toBe(
      "line-clamp-1 text-sm font-normal text-text-primary",
    );
  });
});

describe("shouldShowPreview", () => {
  it("hides preview in inbox", () => {
    expect(shouldShowPreview("inbox")).toBe(false);
  });

  it("shows preview outside inbox", () => {
    expect(shouldShowPreview("sent")).toBe(true);
    expect(shouldShowPreview("drafts")).toBe(true);
    expect(shouldShowPreview("archive")).toBe(true);
  });
});
