import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessagingAttachmentPreviewModal } from "./messaging-attachment-preview-modal";
import { MessagingComposer } from "./messaging-composer";
import { MessagingMessagesList } from "./messaging-messages-list";
import { MessagingReader } from "./messaging-reader";
import type { MessageAttachment, MessagingMessage } from "./types";

function getComposerAttachmentInput(container: HTMLElement) {
  const input = container.querySelector(
    'input[type="file"][multiple]',
  ) as HTMLInputElement | null;
  if (!input) {
    throw new Error("Attachment input not found");
  }
  return input;
}

function getComposerInlineImageInput(container: HTMLElement) {
  const input = container.querySelector(
    'input[type="file"]:not([multiple])',
  ) as HTMLInputElement | null;
  if (!input) {
    throw new Error("Inline image input not found");
  }
  return input;
}

describe("Messaging attachments", () => {
  it("adds attachments from file input and removes them", () => {
    const { container } = render(
      <MessagingComposer
        recipients={[{ value: "u-anne", label: "Anne Rousselet" }]}
        onCancel={vi.fn()}
      />,
    );

    const file = new File(["doc"], "devoir.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(getComposerAttachmentInput(container), {
      target: { files: [file] },
    });

    expect(screen.getByText("devoir.pdf")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(screen.queryByText("devoir.pdf")).not.toBeInTheDocument();
  });

  it("deduplicates attachments by filename", () => {
    const { container } = render(
      <MessagingComposer
        recipients={[{ value: "u-anne", label: "Anne Rousselet" }]}
        onCancel={vi.fn()}
      />,
    );

    const duplicateA = new File(["a"], "piece.pdf", {
      type: "application/pdf",
    });
    const duplicateB = new File(["b"], "piece.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(getComposerAttachmentInput(container), {
      target: { files: [duplicateA, duplicateB] },
    });

    expect(screen.getAllByText("piece.pdf")).toHaveLength(1);
  });

  it("adds attachments from drag-and-drop area", () => {
    render(
      <MessagingComposer
        recipients={[{ value: "u-anne", label: "Anne Rousselet" }]}
        onCancel={vi.fn()}
      />,
    );

    const dropzone = screen
      .getByText("Deposez vos fichiers ici, ou selectionnez un fichier.")
      .closest("div");
    expect(dropzone).not.toBeNull();

    const file1 = new File(["1"], "note.txt", { type: "text/plain" });
    const file2 = new File(["2"], "bulletin.pdf", { type: "application/pdf" });
    fireEvent.drop(dropzone as HTMLElement, {
      dataTransfer: { files: [file1, file2] },
    });

    expect(screen.getByText("note.txt")).toBeInTheDocument();
    expect(screen.getByText("bulletin.pdf")).toBeInTheDocument();
  });

  it("rejects inline image upload when file is not an image", async () => {
    const onUploadInlineImage = vi.fn();
    const { container } = render(
      <MessagingComposer
        recipients={[{ value: "u-anne", label: "Anne Rousselet" }]}
        onCancel={vi.fn()}
        onUploadInlineImage={onUploadInlineImage}
      />,
    );

    const badFile = new File(["x"], "not-image.txt", { type: "text/plain" });
    fireEvent.change(getComposerInlineImageInput(container), {
      target: { files: [badFile] },
    });

    await waitFor(() =>
      expect(
        screen.getByText("Le fichier selectionne n'est pas une image."),
      ).toBeInTheDocument(),
    );
    expect(onUploadInlineImage).not.toHaveBeenCalled();
  });

  it("rejects inline image upload when file is larger than 8MB", async () => {
    const onUploadInlineImage = vi.fn();
    const { container } = render(
      <MessagingComposer
        recipients={[{ value: "u-anne", label: "Anne Rousselet" }]}
        onCancel={vi.fn()}
        onUploadInlineImage={onUploadInlineImage}
      />,
    );

    const heavyImage = new File(["image"], "heavy.png", { type: "image/png" });
    Object.defineProperty(heavyImage, "size", {
      value: 9 * 1024 * 1024,
      configurable: true,
    });

    fireEvent.change(getComposerInlineImageInput(container), {
      target: { files: [heavyImage] },
    });

    await waitFor(() =>
      expect(
        screen.getByText("Image trop lourde (max 8 Mo)."),
      ).toBeInTheDocument(),
    );
    expect(onUploadInlineImage).not.toHaveBeenCalled();
  });

  it("shows error when inline image upload callback is not provided", async () => {
    const { container } = render(
      <MessagingComposer
        recipients={[{ value: "u-anne", label: "Anne Rousselet" }]}
        onCancel={vi.fn()}
      />,
    );

    const imageFile = new File(["image"], "photo.png", { type: "image/png" });
    fireEvent.change(getComposerInlineImageInput(container), {
      target: { files: [imageFile] },
    });

    await waitFor(() =>
      expect(
        screen.getByText("Upload image indisponible."),
      ).toBeInTheDocument(),
    );
  });

  it("inserts uploaded inline image in editor when upload succeeds", async () => {
    const onUploadInlineImage = vi
      .fn()
      .mockResolvedValue("https://cdn.example.com/photo.png");
    const { container } = render(
      <MessagingComposer
        recipients={[{ value: "u-anne", label: "Anne Rousselet" }]}
        onCancel={vi.fn()}
        onUploadInlineImage={onUploadInlineImage}
      />,
    );

    const imageFile = new File(["image"], "photo.png", { type: "image/png" });
    fireEvent.change(getComposerInlineImageInput(container), {
      target: { files: [imageFile] },
    });

    await waitFor(() => expect(onUploadInlineImage).toHaveBeenCalledTimes(1));
    expect(container.querySelector('img[alt="photo.png"]')).toBeInTheDocument();
  });

  it("shows inline image upload api failure error", async () => {
    const onUploadInlineImage = vi
      .fn()
      .mockRejectedValue(new Error("upload failed"));
    const { container } = render(
      <MessagingComposer
        recipients={[{ value: "u-anne", label: "Anne Rousselet" }]}
        onCancel={vi.fn()}
        onUploadInlineImage={onUploadInlineImage}
      />,
    );

    const imageFile = new File(["image"], "photo.png", { type: "image/png" });
    fireEvent.change(getComposerInlineImageInput(container), {
      target: { files: [imageFile] },
    });

    await waitFor(() =>
      expect(screen.getByText("upload failed")).toBeInTheDocument(),
    );
    expect(onUploadInlineImage).toHaveBeenCalledTimes(1);
  });

  it("shows attachment count badge in messages list when attachments are present", () => {
    const messages: MessagingMessage[] = [
      {
        id: "msg-with-pj",
        folder: "sent",
        sender: "Moi",
        subject: "Sujet avec PJ",
        preview: "Apercu",
        createdAt: "21 fevr. 2026, 08:10",
        unread: false,
        body: ["Message"],
        attachments: [
          {
            id: "a1",
            fileName: "doc1.pdf",
            sizeLabel: "120 Ko",
            mimeType: "application/pdf",
          },
          {
            id: "a2",
            fileName: "doc2.pdf",
            sizeLabel: "80 Ko",
            mimeType: "application/pdf",
          },
        ],
      },
    ];

    render(
      <MessagingMessagesList
        panelLabel="Messages envoyes"
        folder="sent"
        messages={messages}
        selectedMessageId="msg-with-pj"
        onSelectMessage={vi.fn()}
      />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("opens attachment from reader when attachment row is clicked", () => {
    const onOpenAttachment = vi.fn();
    const attachment: MessageAttachment = {
      id: "pj-1",
      fileName: "convocation.pdf",
      sizeLabel: "56 Ko",
      mimeType: "application/pdf",
    };
    render(
      <MessagingReader
        message={{
          id: "msg-1",
          folder: "inbox",
          sender: "MBELE Valery",
          subject: "Sujet",
          preview: "Apercu",
          createdAt: "21 fevr. 2026, 09:00",
          unread: true,
          body: ["Bonjour"],
          attachments: [attachment],
        }}
        onOpenAttachment={onOpenAttachment}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /convocation.pdf/i }));
    expect(onOpenAttachment).toHaveBeenCalledWith(attachment);
  });

  it("renders attachment preview modal and closes it", () => {
    const onClose = vi.fn();
    render(
      <MessagingAttachmentPreviewModal
        attachment={{
          id: "pj-2",
          fileName: "emploi-du-temps.pdf",
          sizeLabel: "90 Ko",
          mimeType: "application/pdf",
        }}
        onClose={onClose}
      />,
    );

    expect(screen.getByText("EMPLOI-DU-TEMPS.PDF")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
