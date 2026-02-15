import { IsArray, IsIn, IsOptional, IsString } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsIn(["ADMIN", "SALES", "SUPPORT", "NONE"])
  platformRole?: "ADMIN" | "SALES" | "SUPPORT" | "NONE";

  @IsOptional()
  @IsArray()
  @IsIn(["ADMIN", "SALES", "SUPPORT"], { each: true })
  platformRoles?: Array<"ADMIN" | "SALES" | "SUPPORT">;

  @IsOptional()
  @IsIn([
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SCHOOL_ACCOUNTANT",
    "TEACHER",
    "PARENT",
    "STUDENT",
    "NONE",
  ])
  schoolRole?:
    | "SCHOOL_ADMIN"
    | "SCHOOL_MANAGER"
    | "SUPERVISOR"
    | "SCHOOL_ACCOUNTANT"
    | "TEACHER"
    | "PARENT"
    | "STUDENT"
    | "NONE";

  @IsOptional()
  @IsArray()
  @IsIn(
    [
      "SCHOOL_ADMIN",
      "SCHOOL_MANAGER",
      "SUPERVISOR",
      "SCHOOL_ACCOUNTANT",
      "TEACHER",
      "PARENT",
      "STUDENT",
    ],
    { each: true },
  )
  schoolRoles?: Array<
    | "SCHOOL_ADMIN"
    | "SCHOOL_MANAGER"
    | "SUPERVISOR"
    | "SCHOOL_ACCOUNTANT"
    | "TEACHER"
    | "PARENT"
    | "STUDENT"
  >;

  @IsOptional()
  @IsIn([
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
  ])
  role?:
    | "ADMIN"
    | "SALES"
    | "SUPPORT"
    | "SCHOOL_ADMIN"
    | "SCHOOL_MANAGER"
    | "SUPERVISOR"
    | "SCHOOL_ACCOUNTANT"
    | "TEACHER"
    | "PARENT"
    | "STUDENT";
}
