import { IsEmail } from "class-validator";

export class ProfileSetupOptionsDto {
  @IsEmail()
  email!: string;
}
