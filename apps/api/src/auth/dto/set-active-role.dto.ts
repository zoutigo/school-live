import { IsIn, IsString } from "class-validator";

const APP_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SALES",
  "SUPPORT",
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "TEACHER",
  "PARENT",
  "STUDENT",
] as const;

export class SetActiveRoleDto {
  @IsString()
  @IsIn(APP_ROLES)
  role!: (typeof APP_ROLES)[number];
}
