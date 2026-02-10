import { IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message:
      'Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.'
  })
  newPassword!: string;
}
