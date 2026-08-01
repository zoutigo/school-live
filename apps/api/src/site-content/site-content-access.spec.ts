import type { AuthenticatedUser } from "../auth/auth.types.js";
import { isPlatformAdmin } from "./site-content-access.js";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    profileCompleted: true,
    platformRoles: [],
    memberships: [],
    ...overrides,
  };
}

describe("isPlatformAdmin", () => {
  it("est vrai quand activeRole vaut SUPER_ADMIN", () => {
    expect(
      isPlatformAdmin(
        makeUser({ activeRole: "SUPER_ADMIN", platformRoles: [] }),
      ),
    ).toBe(true);
  });

  it("est vrai quand activeRole vaut ADMIN", () => {
    expect(
      isPlatformAdmin(makeUser({ activeRole: "ADMIN", platformRoles: [] })),
    ).toBe(true);
  });

  it("est faux quand activeRole est un autre rôle, même avec platformRoles SUPER_ADMIN", () => {
    expect(
      isPlatformAdmin(
        makeUser({
          activeRole: "SCHOOL_ADMIN",
          platformRoles: ["SUPER_ADMIN"],
        }),
      ),
    ).toBe(false);
  });

  it("retombe sur platformRoles quand activeRole n'est pas encore choisi", () => {
    expect(
      isPlatformAdmin(
        makeUser({ activeRole: null, platformRoles: ["SUPER_ADMIN"] }),
      ),
    ).toBe(true);
    expect(
      isPlatformAdmin(makeUser({ activeRole: null, platformRoles: ["ADMIN"] })),
    ).toBe(true);
    expect(
      isPlatformAdmin(makeUser({ activeRole: null, platformRoles: ["SALES"] })),
    ).toBe(false);
  });
});
