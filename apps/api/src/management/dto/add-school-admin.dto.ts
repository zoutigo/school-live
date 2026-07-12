import { IsEmail, IsOptional, IsString, Matches } from "class-validator";

const PHONE_PIN_REGEX = /^\d{6}$/;

export class AddSchoolAdminDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_PIN_REGEX, {
    message: "Le PIN doit contenir exactement 6 chiffres.",
  })
  pin?: string;
}
