import { IsEmail, IsOptional, IsString } from "class-validator";

export class OnboardingOptionsDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  setupToken?: string;
}
