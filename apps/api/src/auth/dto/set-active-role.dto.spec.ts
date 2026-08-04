/**
 * Régression : le endpoint PUT /me/active-role rejetait "SCHOOL_HEALTH_OFFICER"
 * (et "SCHOOL_STAFF") avec une erreur 400 "role must be one of the following
 * values" alors que ces rôles existent côté AppRole/SchoolRole et sont
 * proposés dans les sélecteurs mobile et web. La whitelist IsIn de ce DTO
 * avait dérivé du type AppRole canonique (auth.types.ts).
 */

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { AppRole } from "../auth.types.js";
import { SetActiveRoleDto } from "./set-active-role.dto.js";

const ALL_APP_ROLES: AppRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SALES",
  "SUPPORT",
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

describe("SetActiveRoleDto", () => {
  it.each(ALL_APP_ROLES)("accepte le rôle %s", async (role) => {
    const dto = plainToInstance(SetActiveRoleDto, { role });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejette un rôle inconnu", async () => {
    const dto = plainToInstance(SetActiveRoleDto, { role: "NOT_A_ROLE" });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("role");
  });

  it("rejette une valeur absente", async () => {
    const dto = plainToInstance(SetActiveRoleDto, {});
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
