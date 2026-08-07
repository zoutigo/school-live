import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassFeedPage from "./page";
import { usePageHelpStore } from "../../../../../../../store/page-help";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt", classId: "class-1" }),
  useRouter: () => ({ replace: replaceMock }),
}));

let capturedProps: Record<string, unknown> | null = null;
vi.mock("../../../../../../../components/feed/family-feed-page", () => ({
  FamilyFeedPage: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid="family-feed-page" />;
  },
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const contextPayload = {
  schoolYears: [{ id: "sy-1", label: "2025-2026", isActive: true }],
  selectedSchoolYearId: "sy-1",
  assignments: [
    {
      classId: "class-1",
      subjectId: "sub-1",
      className: "6eC",
      subjectName: "Anglais",
      schoolYearId: "sy-1",
    },
  ],
  students: [],
};

function mockRouter(role: string, onboardingHelpEnabled?: boolean) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith("/schools/college-vogt/me")) {
      return jsonResponse({
        role,
        ...(onboardingHelpEnabled !== undefined
          ? { onboardingHelpEnabled }
          : {}),
      });
    }
    if (url.endsWith("/schools/college-vogt/student-grades/context")) {
      return jsonResponse(contextPayload);
    }
    return jsonResponse({ message: `Unhandled ${url}` }, 404);
  });
}

describe("TeacherClassFeedPage — tour d'aide guidée enseignant", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    capturedProps = null;
    useOnboardingTourStore.setState({
      activeTourId: null,
      activeRole: null,
      steps: [],
      stepIndex: 0,
      targetRect: null,
    });
    usePageHelpStore.setState({ entry: null, open: false });
  });

  it("démarre le tour feed-filters pour un enseignant par défaut", async () => {
    mockRouter("TEACHER");

    render(<TeacherClassFeedPage />);

    await waitFor(() =>
      expect(screen.getByTestId("family-feed-page")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        "feed-filters",
      ),
    );
    expect(useOnboardingTourStore.getState().activeRole).toBe("teacher");
    expect(capturedProps?.viewerRole).toBe("TEACHER");
  });

  it("ne démarre pas le tour si onboardingHelpEnabled est désactivé", async () => {
    mockRouter("TEACHER", false);

    render(<TeacherClassFeedPage />);

    await waitFor(() =>
      expect(screen.getByTestId("family-feed-page")).toBeInTheDocument(),
    );
    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("ne démarre pas le tour teacher pour un rôle admin", async () => {
    mockRouter("SCHOOL_ADMIN");

    render(<TeacherClassFeedPage />);

    await waitFor(() =>
      expect(screen.getByTestId("family-feed-page")).toBeInTheDocument(),
    );
    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("redirige les rôles non autorisés vers le tableau de bord", async () => {
    mockRouter("PARENT");

    render(<TeacherClassFeedPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      ),
    );
  });
});
