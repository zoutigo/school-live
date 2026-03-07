import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from "class-validator";

export class ActivationCompleteDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsEmail()
  email?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(6)
  phone?: string;

  @IsOptional()
  @IsString()
  schoolSlug?: string;

  @IsString()
  @MinLength(6)
  confirmedPhone!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  newPin!: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  initialPin?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  activationCode?: string;
}
