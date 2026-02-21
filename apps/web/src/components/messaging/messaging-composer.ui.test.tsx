import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessagingComposer } from "./messaging-composer";

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

function getRecipientSelect(container: HTMLElement) {
  const select = container.querySelector(
    'select[class*="h-10"][class*="bg-surface"]',
  ) as HTMLSelectElement | null;
  if (!select) {
    throw new Error("Recipient select not found");
  }
  return select;
}

describe("MessagingComposer", () => {
  it("keeps send button disabled while required fields are incomplete", () => {
    const { container } = render(
      <MessagingComposer
        recipients={[
          { value: "u-anne", label: "Anne Rousselet" },
          { value: "u-pierre", label: "Pierre W" },
        ]}
        onCancel={vi.fn()}
      />,
    );

    const sendButton = screen.getByRole("button", { name: "Envoyer" });
    expect(sendButton).toBeDisabled();

    const recipientSelect = getRecipientSelect(container);
    fireEvent.change(recipientSelect, { target: { value: "u-anne" } });
    expect(sendButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Objet du message"), {
      target: { value: "Demande de suivi" },
    });
    expect(sendButton).toBeDisabled();

    setEditorText(container, "Bonjour");
    expect(sendButton).toBeEnabled();
  });

  it("sends payload with selected recipient, subject and editor html", async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <MessagingComposer
        recipients={[{ value: "u-anne", label: "Anne Rousselet" }]}
        onCancel={vi.fn()}
        onSend={onSend}
      />,
    );

    fireEvent.change(getRecipientSelect(container), {
      target: { value: "u-anne" },
    });
    fireEvent.change(screen.getByPlaceholderText("Objet du message"), {
      target: { value: "Nouveau message test" },
    });
    setEditorText(container, "Contenu du message");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
    expect(onSend).toHaveBeenCalledWith({
      recipientUserIds: ["u-anne"],
      subject: "Nouveau message test",
      body: expect.stringContaining("Contenu du message"),
    });
    expect(screen.getByText("Message envoye.")).toBeInTheDocument();
  });

  it("prefills recipient and subject in reply mode inputs", () => {
    const { container } = render(
      <MessagingComposer
        recipients={[
          { value: "u-anne", label: "Anne Rousselet" },
          { value: "u-pierre", label: "Pierre W" },
        ]}
        initialSubject="Re: Demande de suivi"
        initialRecipientUserIds={["u-anne"]}
        onCancel={vi.fn()}
      />,
    );

    const recipientSelect = getRecipientSelect(container);
    expect(recipientSelect.value).toBe("u-anne");
    expect(
      screen.getByDisplayValue("Re: Demande de suivi"),
    ).toBeInTheDocument();
  });

  it("prefills forwarded body and allows send only after recipient selection", () => {
    const { container } = render(
      <MessagingComposer
        recipients={[
          { value: "u-anne", label: "Anne Rousselet" },
          { value: "u-pierre", label: "Pierre W" },
        ]}
        initialSubject="Tr: Demande de suivi"
        initialBody="<p>---------- Message transfere ----------</p><p>Corps original</p>"
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByDisplayValue("Tr: Demande de suivi"),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("Message transfere");

    const sendButton = screen.getByRole("button", { name: "Envoyer" });
    expect(sendButton).toBeDisabled();

    fireEvent.change(getRecipientSelect(container), {
      target: { value: "u-pierre" },
    });
    setEditorText(container, "Corps transfere");

    expect(sendButton).toBeEnabled();
  });

  it("calls save draft and shows confirmation message", async () => {
    const onSaveDraft = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <MessagingComposer
        recipients={[{ value: "u-anne", label: "Anne Rousselet" }]}
        onCancel={vi.fn()}
        onSaveDraft={onSaveDraft}
      />,
    );

    fireEvent.change(getRecipientSelect(container), {
      target: { value: "u-anne" },
    });
    fireEvent.change(screen.getByPlaceholderText("Objet du message"), {
      target: { value: "Brouillon" },
    });
    setEditorText(container, "Corps brouillon");

    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer en brouillon" }),
    );

    await waitFor(() => expect(onSaveDraft).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Brouillon enregistre.")).toBeInTheDocument();
  });

  it("calls back-to-list callback when cancel is clicked", () => {
    const onRequestBackToList = vi.fn();
    render(
      <MessagingComposer
        recipients={[{ value: "u-anne", label: "Anne Rousselet" }]}
        onCancel={vi.fn()}
        onRequestBackToList={onRequestBackToList}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onRequestBackToList).toHaveBeenCalledTimes(1);
  });
});
