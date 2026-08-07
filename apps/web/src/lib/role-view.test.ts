import { describe, expect, it } from "vitest";
import { extractAvailableRoles, isPlatformRole, isRole } from "./role-view";

describe("extractAvailableRoles", () => {
  it("returns an empty array when there is no user", () => {
    expect(extractAvailableRoles(null)).toEqual([]);
  });

  it("includes platform roles regardless of school context", () => {
    const roles = extractAvailableRoles({
      role: "SCHOOL_ADMIN",
      activeRole: "SCHOOL_ADMIN",
      platformRoles: ["SUPPORT"],
      memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" }],
      activeSchoolId: "school-1",
    });

    expect(roles).toContain("SUPPORT");
    expect(roles).toContain("SCHOOL_ADMIN");
  });

  /**
   * Régression : un utilisateur avec des memberships dans plusieurs écoles
   * ne doit se voir proposer que le rôle de l'école active, pas les rôles
   * qu'il détient dans d'autres écoles où il n'est pas connecté.
   */
  it("excludes memberships roles from schools other than the active one", () => {
    const roles = extractAvailableRoles({
      role: "SCHOOL_HEALTH_OFFICER",
      activeRole: "SCHOOL_HEALTH_OFFICER",
      platformRoles: [],
      memberships: [
        { schoolId: "school-1", role: "SCHOOL_HEALTH_OFFICER" },
        { schoolId: "school-2", role: "TEACHER" },
        { schoolId: "school-3", role: "PARENT" },
      ],
      activeSchoolId: "school-1",
    });

    expect(roles).toEqual(["SCHOOL_HEALTH_OFFICER"]);
    expect(roles).not.toContain("TEACHER");
    expect(roles).not.toContain("PARENT");
  });

  it("includes several roles held within the same active school", () => {
    const roles = extractAvailableRoles({
      role: "PARENT",
      activeRole: "PARENT",
      platformRoles: [],
      memberships: [
        { schoolId: "school-1", role: "PARENT" },
        { schoolId: "school-1", role: "TEACHER" },
      ],
      activeSchoolId: "school-1",
    });

    expect(roles).toContain("PARENT");
    expect(roles).toContain("TEACHER");
    expect(roles).toHaveLength(2);
  });

  it("falls back to the first school when activeSchoolId is absent", () => {
    const roles = extractAvailableRoles({
      role: "TEACHER",
      activeRole: "TEACHER",
      platformRoles: [],
      memberships: [
        { schoolId: "school-1", role: "TEACHER" },
        { schoolId: "school-2", role: "PARENT" },
      ],
      activeSchoolId: null,
      schools: [{ schoolId: "school-1" }, { schoolId: "school-2" }],
    });

    expect(roles).toContain("TEACHER");
    expect(roles).not.toContain("PARENT");
  });

  it("recomputes the available roles after the active school changes", () => {
    const me = {
      role: "SCHOOL_HEALTH_OFFICER" as const,
      platformRoles: [],
      memberships: [
        { schoolId: "school-1", role: "SCHOOL_HEALTH_OFFICER" as const },
        { schoolId: "school-2", role: "TEACHER" as const },
      ],
    };

    const beforeSwitch = extractAvailableRoles({
      ...me,
      activeRole: "SCHOOL_HEALTH_OFFICER",
      activeSchoolId: "school-1",
    });
    expect(beforeSwitch).toEqual(["SCHOOL_HEALTH_OFFICER"]);

    const afterSwitch = extractAvailableRoles({
      ...me,
      role: "TEACHER",
      activeRole: "TEACHER",
      activeSchoolId: "school-2",
    });
    expect(afterSwitch).toEqual(["TEACHER"]);
  });
});

describe("isRole / isPlatformRole", () => {
  it("validates known role strings only", () => {
    expect(isRole("TEACHER")).toBe(true);
    expect(isRole("NOT_A_ROLE")).toBe(false);
  });

  it("distinguishes platform roles from school roles", () => {
    expect(isPlatformRole("SUPPORT")).toBe(true);
    expect(isPlatformRole("TEACHER")).toBe(false);
  });
});
