import { IsArray, IsEnum, ArrayMinSize } from "class-validator";

const SCHOOL_ROLES = [
  "TEACHER",
  "PARENT",
  "STUDENT",
  "SCHOOL_STAFF",
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
] as const;

export type SchoolRoleValue = (typeof SCHOOL_ROLES)[number];

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayMinSize(1, { message: "Au moins un rôle est requis." })
  @IsEnum(SCHOOL_ROLES, { each: true, message: "Rôle invalide." })
  roles!: SchoolRoleValue[];
}
