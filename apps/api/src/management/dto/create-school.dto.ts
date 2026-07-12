import { SchoolCycle, SchoolLanguageSystem } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";

const SCHOOL_LOGO_URL_REGEX = /^https?:\/\/.+$/;
const PHONE_PIN_REGEX = /^\d{6}$/;

export class CreateSchoolDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(SchoolCycle)
  cycle?: SchoolCycle;

  @IsOptional()
  @IsEnum(SchoolLanguageSystem)
  languageSystem?: SchoolLanguageSystem;

  @IsOptional()
  @IsEmail()
  schoolAdminEmail?: string;

  @IsOptional()
  @IsString()
  schoolAdminPhone?: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_PIN_REGEX, {
    message: "Le PIN doit contenir exactement 6 chiffres.",
  })
  schoolAdminPin?: string;

  @IsOptional()
  @IsString()
  @Matches(SCHOOL_LOGO_URL_REGEX, { message: "URL logo invalide" })
  logoUrl?: string;
}
