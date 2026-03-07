import { IsEmail, IsIn, IsString, MinLength } from "class-validator";

export class SsoProfileOptionsDto {
  @IsIn(["GOOGLE", "APPLE"])
  provider!: "GOOGLE" | "APPLE";

  @IsString()
  @MinLength(3)
  providerAccountId!: string;

  @IsEmail()
  email!: string;
}
