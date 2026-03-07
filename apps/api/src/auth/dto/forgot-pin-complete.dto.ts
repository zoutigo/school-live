import { IsString, Matches, MinLength } from "class-validator";

export class ForgotPinCompleteDto {
  @IsString()
  @MinLength(16)
  recoveryToken!: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: "Le PIN doit contenir exactement 6 chiffres.",
  })
  newPin!: string;
}
