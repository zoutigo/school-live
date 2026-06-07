import { IsString, MinLength } from "class-validator";

export class LoginUsernameDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
