import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class ForgotPinOptionsDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  phone?: string;
}
