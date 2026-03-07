import { IsOptional, IsString, MinLength } from "class-validator";

export class LoginPhoneDto {
  @IsString()
  @MinLength(6)
  phone!: string;

  @IsString()
  @MinLength(6)
  pin!: string;

  @IsOptional()
  @IsString()
  schoolSlug?: string;
}
