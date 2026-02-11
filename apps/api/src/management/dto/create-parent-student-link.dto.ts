import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class CreateParentStudentLinkDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  parentUserId?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message:
      "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
  })
  password?: string;
}
