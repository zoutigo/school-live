import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PHONE_PIN_REGEX = /^\d{6}$/;

export const CREATABLE_STAFF_ROLES = [
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "SCHOOL_STAFF",
  "SCHOOL_HEALTH_OFFICER",
] as const;

export type CreatableStaffRole = (typeof CREATABLE_STAFF_ROLES)[number];

export class CreateSchoolStaffMemberDto {
  @IsIn(CREATABLE_STAFF_ROLES)
  role!: CreatableStaffRole;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message:
      "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
  })
  password?: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_PIN_REGEX, {
    message: "Le PIN doit contenir exactement 6 chiffres.",
  })
  pin?: string;

  @IsOptional()
  @IsString()
  functionId?: string;
}
