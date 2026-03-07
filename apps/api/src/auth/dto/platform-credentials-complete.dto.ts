import { IsOptional, IsString, Matches, MinLength } from "class-validator";

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class PlatformCredentialsCompleteDto {
  @IsString()
  @MinLength(16)
  token!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message:
      "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
  })
  newPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  newPin?: string;
}
