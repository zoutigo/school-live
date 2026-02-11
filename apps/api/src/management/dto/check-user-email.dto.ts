import { IsEmail } from "class-validator";

export class CheckUserEmailDto {
  @IsEmail()
  email!: string;
}
