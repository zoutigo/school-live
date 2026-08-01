import type { AuthenticatedUser } from "../auth/auth.types.js";
import { isSuperAdmin } from "./site-content-access.js";

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

describe("isSuperAdmin", () => {
  it("est vrai quand activeRole vaut SUPER_ADMIN", () => {
    expect(
      isSuperAdmin(makeUser({ activeRole: "SUPER_ADMIN", platformRoles: [] })),
    ).toBe(true);
  });

  it("est faux quand activeRole est un autre rôle, même avec platformRoles SUPER_ADMIN", () => {
    expect(
      isSuperAdmin(
        makeUser({
          activeRole: "SCHOOL_ADMIN",
          platformRoles: ["SUPER_ADMIN"],
        }),
      ),
    ).toBe(false);
  });

  it("retombe sur platformRoles quand activeRole n'est pas encore choisi", () => {
    expect(
      isSuperAdmin(
        makeUser({ activeRole: null, platformRoles: ["SUPER_ADMIN"] }),
      ),
    ).toBe(true);
    expect(
      isSuperAdmin(makeUser({ activeRole: null, platformRoles: ["ADMIN"] })),
    ).toBe(false);
  });
});
