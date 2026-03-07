import { IsString, Matches } from "class-validator";

export class ChangePinDto {
  @IsString()
  @Matches(/^\d{6}$/)
  currentPin!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  newPin!: string;
}
