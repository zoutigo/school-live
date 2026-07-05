import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformNewMessagePage from "./page";

const pushMock = vi.fn();
let searchParamsStore: Record<string, string> = {};

vi.mock("next/navigation", () => ({
  usePathname: () => "/messagerie/nouveau",
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsStore[key] ?? null,
  }),
}));

vi.mock("../../../lib/auth-cookies", () => ({
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

describe("PlatformNewMessagePage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    searchParamsStore = {};
  });

  it("recherche des destinataires via /system/users et envoie via /admin/messages", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = String(input);

        if (url.includes("/system/users")) {
          return jsonResponse({
            items: [
              {
                id: "u-directeur-a",
                firstName: "Prisca",
                lastName: "Directeur",
                email: "prisca@ecole-a.cm",
                school: { slug: "ecole-a", name: "École A" },
              },
            ],
          });
        }

        if (url.includes("/admin/messages") && !url.includes("uploads")) {
          return jsonResponse({ id: "msg-new" }, 201);
        }

        return jsonResponse({});
      });

    const { container } = render(<PlatformNewMessagePage />);

    const searchInput = screen.getByPlaceholderText(
      "Rechercher un destinataire par nom ou email...",
    );
    fireEvent.change(searchInput, { target: { value: "prisca" } });

    const result = await screen.findByText("Directeur Prisca");
    fireEvent.click(result);

    fireEvent.change(screen.getByPlaceholderText("Objet du message"), {
      target: { value: "Bonjour" },
    });
    setEditorText(container, "Message de test");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => {
      const createCalls = fetchSpy.mock.calls.filter(
        ([url, init]) =>
          String(url).endsWith("/admin/messages") && init?.method === "POST",
      );
      expect(createCalls.length).toBeGreaterThan(0);
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/messagerie"));
  });
});
