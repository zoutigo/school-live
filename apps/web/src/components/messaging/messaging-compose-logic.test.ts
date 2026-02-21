import { describe, expect, it } from "vitest";
import {
  buildDraftSnapshot,
  buildComposeQueryFromMessage,
  canSendMessage,
  getLeaveComposerConfirmMessage,
  hasUnsavedDraftChanges,
} from "./messaging-compose-logic";

describe("canSendMessage", () => {
  it("returns false when recipient is missing", () => {
    const result = canSendMessage({
      hasRecipientGroups: true,
      selectedRecipientsCount: 0,
      recipient: "",
      subject: "Objet",
      bodyText: "Contenu",
      sending: false,
      savingDraft: false,
    });

    expect(result).toBe(false);
  });

  it("returns false when subject is missing", () => {
    const result = canSendMessage({
      hasRecipientGroups: true,
      selectedRecipientsCount: 1,
      recipient: "",
      subject: "   ",
      bodyText: "Contenu",
      sending: false,
      savingDraft: false,
    });

    expect(result).toBe(false);
  });

  it("returns false when body is missing", () => {
    const result = canSendMessage({
      hasRecipientGroups: false,
      selectedRecipientsCount: 0,
      recipient: "user-1",
      subject: "Objet",
      bodyText: "   ",
      sending: false,
      savingDraft: false,
    });

    expect(result).toBe(false);
  });

  it("returns true when recipient, subject and body are provided", () => {
    const result = canSendMessage({
      hasRecipientGroups: false,
      selectedRecipientsCount: 0,
      recipient: "user-1",
      subject: "Objet",
      bodyText: "Contenu",
      sending: false,
      savingDraft: false,
    });

    expect(result).toBe(true);
  });
});

describe("buildComposeQueryFromMessage", () => {
  it("prefills recipient on reply", () => {
    const query = buildComposeQueryFromMessage("reply", {
      id: "msg-1",
      folder: "inbox",
      sender: "DOE John",
      senderUserId: "user-123",
      subject: "Sujet original",
      preview: "preview",
      createdAt: "21 fev. 2026, 10:30",
      unread: true,
      body: ["Ligne 1"],
      attachments: [],
    });

    expect(query.get("subject")).toBe("Re: Sujet original");
    expect(query.get("recipientUserIds")).toBe("user-123");
  });
});

describe("leave composer confirmation", () => {
  it("advises saving draft before leaving when not saved", () => {
    const currentSnapshot = buildDraftSnapshot({
      hasRecipientGroups: true,
      recipient: "",
      selectedRecipientIds: ["user-123"],
      subject: "Objet",
      bodyText: "Contenu",
    });
    const unsaved = hasUnsavedDraftChanges({
      currentSnapshot,
      lastSavedDraftSnapshot: null,
    });

    expect(unsaved).toBe(true);
    expect(getLeaveComposerConfirmMessage(unsaved)).toContain(
      "enregistrer en brouillon",
    );
  });

  it("uses generic confirmation when there is no unsaved change", () => {
    const savedSnapshot = buildDraftSnapshot({
      hasRecipientGroups: false,
      recipient: "",
      selectedRecipientIds: [],
      subject: "",
      bodyText: "",
    });
    const unsaved = hasUnsavedDraftChanges({
      currentSnapshot: savedSnapshot,
      lastSavedDraftSnapshot: savedSnapshot,
    });

    expect(unsaved).toBe(false);
    expect(getLeaveComposerConfirmMessage(unsaved)).toBe(
      "Voulez-vous vraiment revenir a la liste des messages ?",
    );
  });
});
