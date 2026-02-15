import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const USER_AVATAR_URL_REGEX = /^\/files\/users\/avatars\/[a-zA-Z0-9-]+\.webp$/;

export class CreateUserDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message:
      "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
  })
  temporaryPassword!: string;

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
  role!:
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
  @IsArray()
  @IsIn(["ADMIN", "SALES", "SUPPORT"], { each: true })
  platformRoles?: Array<"ADMIN" | "SALES" | "SUPPORT">;

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
  @IsString()
  schoolSlug?: string;

  @IsOptional()
  @IsString()
  @Matches(USER_AVATAR_URL_REGEX, { message: "URL photo invalide" })
  avatarUrl?: string;
}
