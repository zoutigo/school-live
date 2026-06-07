import { IsString, MinLength } from "class-validator";

export class RecoverUsernameStartDto {
  @IsString()
  @MinLength(1)
  username!: string;
}
