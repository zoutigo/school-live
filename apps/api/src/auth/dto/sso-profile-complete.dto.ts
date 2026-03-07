import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class SsoProfileCompleteDto {
  @IsIn(["GOOGLE", "APPLE"])
  provider!: "GOOGLE" | "APPLE";

  @IsString()
  @MinLength(3)
  providerAccountId!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsIn(["M", "F", "OTHER"])
  gender?: "M" | "F" | "OTHER";

  @IsOptional()
  @IsString()
  @MinLength(6)
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  schoolSlug?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  newPin?: string;
}
