import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  assertNoHorizontalOverflowAt320,
  setViewportWidth,
} from "../../test/responsive";
import { MessagingMessageDetail } from "./messaging-message-detail";
import type { MessagingMessage } from "./types";

const MESSAGE: MessagingMessage = {
  id: "msg-1",
  folder: "inbox",
  sender: "MBELE Valery",
  senderUserId: "u-1",
  subject: "Sujet test",
  preview: "Preview",
  createdAt: "21 fevr. 2026, 06:31",
  unread: false,
  body: ["Bonjour"],
  attachments: [],
};

describe("MessagingMessageDetail", () => {
  it("keeps message actions usable on smartphone", () => {
    setViewportWidth(320);
    const onBack = vi.fn();

    render(
      <MessagingMessageDetail
        message={MESSAGE}
        onBack={onBack}
        onOpenAttachment={vi.fn()}
        topActions={
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Repondre">
              Repondre
            </button>
            <button type="button" aria-label="Transferer">
              Transferer
            </button>
          </div>
        }
      />,
    );

    expect(
      screen.getByRole("button", { name: "Retour a la liste" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Repondre" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Transferer" }),
    ).toBeInTheDocument();

    const reader = screen.getByText("Sujet test").closest("section");
    expect(reader).not.toBeNull();
    assertNoHorizontalOverflowAt320(reader as HTMLElement);

    fireEvent.click(screen.getByRole("button", { name: "Retour a la liste" }));
    expect(onBack).toHaveBeenCalled();
  });
});
