import { IsIn, IsString } from "class-validator";
import type { AppRole } from "../auth.types.js";

const APP_ROLES: readonly AppRole[] = [
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
] as const;

export class SetActiveRoleDto {
  @IsString()
  @IsIn(APP_ROLES)
  role!: AppRole;
}
