import { IsEmail, IsString, Matches, MinLength } from "class-validator";

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class FirstPasswordChangeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  temporaryPassword!: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message:
      "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
  })
  newPassword!: string;
}
