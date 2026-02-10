import { IsOptional, IsString, Matches } from 'class-validator';

const SCHOOL_LOGO_URL_REGEX = /^\/files\/schools\/logos\/[a-zA-Z0-9-]+\.webp$/;

export class UpdateSchoolDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(SCHOOL_LOGO_URL_REGEX, { message: 'URL logo invalide' })
  logoUrl?: string;
}
