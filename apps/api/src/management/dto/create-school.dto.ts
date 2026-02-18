import { IsEmail, IsOptional, IsString, Matches } from "class-validator";

const SCHOOL_LOGO_URL_REGEX = /^https?:\/\/.+$/;

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

  @IsEmail()
  schoolAdminEmail!: string;

  @IsOptional()
  @IsString()
  @Matches(SCHOOL_LOGO_URL_REGEX, { message: "URL logo invalide" })
  logoUrl?: string;
}
