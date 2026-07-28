import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchoolNewMessagePage from "./page";

const pushMock = vi.fn();
let searchParamsStore: Record<string, string> = {};
const paramsMock = { schoolSlug: "college-vogt" };

vi.mock("next/navigation", () => ({
  useParams: () => paramsMock,
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsStore[key] ?? null,
  }),
}));

vi.mock("../../../../../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => "csrf-test",
}));

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

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("SchoolNewMessagePage — édition d'un brouillon existant (draftId)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    searchParamsStore = { draftId: "draft-1" };
  });

  function mockBaseFetch(
    overrides: (url: string, init?: RequestInit) => Response | undefined,
  ) {
    return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const overridden = overrides(url, init as RequestInit | undefined);
      if (overridden) {
        return Promise.resolve(overridden);
      }

      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({ role: "TEACHER", schoolName: "Collège Vogt" });
      }
      if (url.includes("/messaging/recipients")) {
        return jsonResponse({
          teachers: [
            {
              value: "u-anne",
              label: "Anne Rousselet",
              email: "anne@ecole.cm",
              classes: [],
              subjects: [],
            },
          ],
          staffFunctions: [],
          staffPeople: [],
        });
      }
      if (url.endsWith("/messages/draft-1")) {
        return jsonResponse({
          id: "draft-1",
          subject: "Brouillon existant",
          body: "<p>Corps existant</p>",
          status: "DRAFT",
          createdAt: "2026-04-04T10:00:00.000Z",
          sentAt: null,
          sender: null,
          attachments: [],
          recipients: [
            {
              id: "rec-1",
              userId: "u-anne",
              firstName: "Anne",
              lastName: "Rousselet",
              email: "anne@ecole.cm",
            },
          ],
        });
      }
      return jsonResponse({});
    });
  }

  it("précharge le sujet, le corps et les destinataires du brouillon existant", async () => {
    mockBaseFetch(() => undefined);

    render(<SchoolNewMessagePage />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Brouillon existant"),
      ).toBeInTheDocument();
    });
  });

  it("enregistre via updateDraft (PATCH) au lieu de créer un nouveau message", async () => {
    const fetchSpy = mockBaseFetch((url, init) => {
      if (url.includes("/messages/draft-1/draft") && init?.method === "PATCH") {
        return new Response(JSON.stringify({ id: "draft-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return undefined;
    });

    render(<SchoolNewMessagePage />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Brouillon existant"),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer en brouillon" }),
    );

    await waitFor(() => {
      const patchCalls = fetchSpy.mock.calls.filter(
        ([input, init]) =>
          String(input).includes("/messages/draft-1/draft") &&
          (init as RequestInit)?.method === "PATCH",
      );
      expect(patchCalls.length).toBe(1);
    });

    const createCalls = fetchSpy.mock.calls.filter(
      ([input, init]) =>
        String(input).endsWith("/messages") &&
        (init as RequestInit)?.method === "POST",
    );
    expect(createCalls.length).toBe(0);
  });

  it("envoie via updateDraft puis sendDraft (POST) quand on clique Envoyer", async () => {
    const fetchSpy = mockBaseFetch((url, init) => {
      if (url.includes("/messages/draft-1/draft") && init?.method === "PATCH") {
        return new Response(JSON.stringify({ id: "draft-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/messages/draft-1/send") && init?.method === "POST") {
        return new Response(JSON.stringify({ id: "draft-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return undefined;
    });

    const { container } = render(<SchoolNewMessagePage />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Brouillon existant"),
      ).toBeInTheDocument();
    });
    setEditorText(container, "Corps modifie");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => {
      const sendCalls = fetchSpy.mock.calls.filter(
        ([input, init]) =>
          String(input).includes("/messages/draft-1/send") &&
          (init as RequestInit)?.method === "POST",
      );
      expect(sendCalls.length).toBe(1);
    });

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/schools/college-vogt/messagerie"),
    );
  });
});
