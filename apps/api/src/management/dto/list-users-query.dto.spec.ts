/**
 * Régression : mêmes whitelists IsIn stales que CreateUserDto/UpdateUserDto
 * — filtrer la liste admin des utilisateurs par role=SCHOOL_HEALTH_OFFICER
 * ou role=SCHOOL_STAFF échouait avec une 400.
 */

import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { AppRole } from "../../auth/auth.types.js";
import { ListUsersQueryDto } from "./list-users-query.dto.js";

const ALL_ROLES: AppRole[] = [
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

describe("ListUsersQueryDto", () => {
  it.each(ALL_ROLES)("accepte le filtre role=%s", async (role) => {
    const dto = plainToInstance(ListUsersQueryDto, { role });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejette un rôle inconnu", async () => {
    const dto = plainToInstance(ListUsersQueryDto, { role: "NOT_A_ROLE" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "role")).toBe(true);
  });
});
