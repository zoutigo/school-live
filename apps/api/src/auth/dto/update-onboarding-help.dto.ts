import { IsBoolean } from "class-validator";

export class UpdateOnboardingHelpDto {
  @IsBoolean()
  onboardingHelpEnabled!: boolean;
}
