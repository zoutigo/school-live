import { IsString, MinLength } from "class-validator";

export class ForgotPasswordOptionsDto {
  @IsString()
  @MinLength(16)
  token!: string;
}
