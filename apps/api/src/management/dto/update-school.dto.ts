import { SchoolCycle, SchoolLanguageSystem } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Matches } from "class-validator";

const SCHOOL_LOGO_URL_REGEX = /^https?:\/\/.+$/;

export class UpdateSchoolDto {
  @IsOptional()
  @IsString()
  name?: string;

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
  @IsString()
  @Matches(SCHOOL_LOGO_URL_REGEX, { message: "URL logo invalide" })
  logoUrl?: string;
}
