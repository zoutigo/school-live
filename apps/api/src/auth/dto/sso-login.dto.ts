import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class SsoLoginDto {
  @IsIn(["GOOGLE", "APPLE"])
  provider!: "GOOGLE" | "APPLE";

  @IsString()
  @MinLength(3)
  providerAccountId!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  schoolSlug?: string;
}
