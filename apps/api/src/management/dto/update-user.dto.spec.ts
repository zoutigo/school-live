/**
 * Régression : mêmes whitelists IsIn stales que CreateUserDto pour `role`,
 * `schoolRole` et `schoolRoles` — voir create-user.dto.spec.ts et
 * set-active-role.dto.spec.ts pour le bug d'origine (SCHOOL_HEALTH_OFFICER
 * rejeté lors du changement de rôle actif).
 */

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { SchoolRole } from "../../auth/auth.types.js";
import { UpdateUserDto } from "./update-user.dto.js";

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

describe("UpdateUserDto", () => {
  it.each(SCHOOL_ROLES)("accepte le rôle %s dans `role`", async (role) => {
    const dto = plainToInstance(UpdateUserDto, { role });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it.each(SCHOOL_ROLES)(
    "accepte le rôle %s dans `schoolRole`",
    async (role) => {
      const dto = plainToInstance(UpdateUserDto, { schoolRole: role });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    },
  );

  it("accepte NONE dans `schoolRole`", async () => {
    const dto = plainToInstance(UpdateUserDto, { schoolRole: "NONE" });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it.each(SCHOOL_ROLES)(
    "accepte le rôle %s dans `schoolRoles`",
    async (role) => {
      const dto = plainToInstance(UpdateUserDto, { schoolRoles: [role] });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    },
  );

  it("rejette un rôle inconnu", async () => {
    const dto = plainToInstance(UpdateUserDto, { role: "NOT_A_ROLE" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "role")).toBe(true);
  });
});
