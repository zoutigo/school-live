/**
 * Régression : la whitelist IsIn de `role`/`schoolRoles` avait dérivé du
 * type SchoolRole canonique (auth.types.ts), rejetant SCHOOL_STAFF et
 * SCHOOL_HEALTH_OFFICER avec une 400 lors de la création d'un utilisateur
 * (même bug que PUT /me/active-role, cf set-active-role.dto.spec.ts).
 */

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { SchoolRole } from "../../auth/auth.types.js";
import { CreateUserDto } from "./create-user.dto.js";

const SCHOOL_ROLES: SchoolRole[] = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "SCHOOL_STAFF",
  "SCHOOL_HEALTH_OFFICER",
  "TEACHER",
  "PARENT",
  "STUDENT",
];

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "Jean",
    lastName: "Mbarga",
    email: "jean@ecole.com",
    temporaryPassword: "Password123",
    ...overrides,
  };
}

describe("CreateUserDto", () => {
  it.each(SCHOOL_ROLES)("accepte le rôle %s dans `role`", async (role) => {
    const dto = plainToInstance(CreateUserDto, basePayload({ role }));
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it.each(SCHOOL_ROLES)(
    "accepte le rôle %s dans `schoolRoles`",
    async (role) => {
      const dto = plainToInstance(
        CreateUserDto,
        basePayload({ schoolRoles: [role] }),
      );
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    },
  );

  it("rejette un rôle inconnu", async () => {
    const dto = plainToInstance(
      CreateUserDto,
      basePayload({ role: "NOT_A_ROLE" }),
    );
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "role")).toBe(true);
  });
});
