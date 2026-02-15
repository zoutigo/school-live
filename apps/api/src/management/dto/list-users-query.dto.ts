import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn([
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
  ])
  role?:
    | "SUPER_ADMIN"
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

  @IsOptional()
  @IsString()
  schoolSlug?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "PASSWORD_CHANGE_REQUIRED"])
  state?: "ACTIVE" | "PASSWORD_CHANGE_REQUIRED";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
