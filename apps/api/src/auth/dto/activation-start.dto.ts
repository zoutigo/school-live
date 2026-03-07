import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from "class-validator";

export class ActivationStartDto {
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
}
