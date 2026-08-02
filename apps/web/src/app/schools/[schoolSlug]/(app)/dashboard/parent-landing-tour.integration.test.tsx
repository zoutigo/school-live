/**
 * Tour d'aide guidée "parent-landing" — intégration AppShell + DashboardPage.
 * Vérifie que le tour se déclenche pour un parent sur son dashboard, que
 * l'étape "menu" (advanceOnTargetPress) ouvre réellement le tiroir mobile
 * pour que les cibles suivantes (messagerie, enfants, compte — qui vivent
 * dans ce même tiroir) puissent se monter, et que la progression complète
 * marque bien "parent-landing" comme terminé pour le rôle parent.
 */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setViewportWidth } from "../../../../../test/responsive";
import { AppShell } from "../../../../../components/layout/app-shell";
import { useOnboardingTourStore } from "../../../../../store/onboarding-tour";
import {
  PARENT_LANDING_TOUR_ID,
  PARENT_LANDING_TOUR_TARGETS,
} from "./parent-landing-tour.config";
import DashboardPage from "./page";

const replaceMock = vi.fn();
let paramsMock = { schoolSlug: "college-vogt" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  useParams: () => paramsMock,
  usePathname: () => "/schools/college-vogt/dashboard",
}));

vi.mock("../../../../../components/feed/family-feed-page", () => ({
  FamilyFeedPage: () => <div>Family feed stub</div>,
}));

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Tour parent-landing — intégration AppShell + DashboardPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    paramsMock = { schoolSlug: "college-vogt" };
    useOnboardingTourStore.setState({
      completedTours: {},
      activeTourId: null,
      activeRole: null,
      steps: [],
      stepIndex: 0,
      targetRect: null,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/public")) {
        return createJsonResponse({ name: "College Vogt", logoUrl: null });
      }

      // AppShell's own global /me (distinct from the school-scoped /me
      // fetched by DashboardPage below).
      if (url.endsWith("/me")) {
        return createJsonResponse({
          firstName: "Robert",
          lastName: "Ntamack",
          role: "PARENT",
          activeRole: "PARENT",
          platformRoles: [],
          memberships: [{ schoolId: "school-1", role: "PARENT" }],
        });
      }

      if (url.includes("/schools/college-vogt/me")) {
        return createJsonResponse({
          firstName: "Robert",
          lastName: "Ntamack",
          role: "PARENT",
          linkedStudents: [],
        });
      }

      if (url.includes("/auth/me/parent-dashboard-summary")) {
        return createJsonResponse({
          unreadMessages: 0,
          payments: {
            connected: false,
            pendingCount: null,
            overdueCount: null,
            detail: "",
          },
          documents: {
            recentCount: 0,
            totalPublishedCount: 0,
            detail: "",
            latest: [],
          },
        });
      }

      return createJsonResponse({ message: "Not found" }, 404);
    });
  });

  it("démarre le tour et ouvre le tiroir mobile en cliquant sur le menu (advanceOnTargetPress)", async () => {
    setViewportWidth(390);

    render(
      <AppShell schoolSlug="college-vogt" schoolName="College Vogt">
        <DashboardPage />
      </AppShell>,
    );

    await waitFor(() =>
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        PARENT_LANDING_TOUR_ID,
      ),
    );
    expect(useOnboardingTourStore.getState().stepIndex).toBe(0);

    // Avant ouverture du tiroir, la cible "messagerie" n'existe nulle part
    // dans le DOM visible (elle vit dans le AppSidebar mobile, monté
    // seulement quand le tiroir est ouvert).
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Ouvrir le menu"));

    // Le clic déclenche à la fois l'ouverture réelle du tiroir et
    // l'avancement du tour (voir le onClick câblé dans app-header.tsx).
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(useOnboardingTourStore.getState().stepIndex).toBe(1);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("link", { name: /Messagerie/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: /Mon compte/i }),
    ).toBeInTheDocument();
  });

  it("avance jusqu'au bout du tour et le marque comme complété pour le rôle parent", async () => {
    render(
      <AppShell schoolSlug="college-vogt" schoolName="College Vogt">
        <DashboardPage />
      </AppShell>,
    );

    await waitFor(() =>
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        PARENT_LANDING_TOUR_ID,
      ),
    );

    const steps = useOnboardingTourStore.getState().steps;
    expect(steps.map((step) => step.targetKey)).toEqual([
      PARENT_LANDING_TOUR_TARGETS.menu,
      PARENT_LANDING_TOUR_TARGETS.messaging,
      PARENT_LANDING_TOUR_TARGETS.children,
      PARENT_LANDING_TOUR_TARGETS.account,
    ]);

    useOnboardingTourStore
      .getState()
      .advanceIfTarget(PARENT_LANDING_TOUR_TARGETS.menu);
    useOnboardingTourStore.getState().next();
    useOnboardingTourStore.getState().next();
    expect(useOnboardingTourStore.getState().stepIndex).toBe(3);

    useOnboardingTourStore.getState().finish();

    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
    expect(
      useOnboardingTourStore
        .getState()
        .isCompleted("parent", PARENT_LANDING_TOUR_ID),
    ).toBe(true);
  });
});
