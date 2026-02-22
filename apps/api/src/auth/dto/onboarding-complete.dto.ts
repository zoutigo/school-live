import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from "class-validator";

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

class RecoveryAnswerDto {
  @IsIn([
    "MOTHER_MAIDEN_NAME",
    "FATHER_FIRST_NAME",
    "FAVORITE_SPORT",
    "FAVORITE_TEACHER",
    "BIRTH_CITY",
    "CHILDHOOD_NICKNAME",
    "FAVORITE_BOOK",
  ])
  questionKey!:
    | "MOTHER_MAIDEN_NAME"
    | "FATHER_FIRST_NAME"
    | "FAVORITE_SPORT"
    | "FAVORITE_TEACHER"
    | "BIRTH_CITY"
    | "CHILDHOOD_NICKNAME"
    | "FAVORITE_BOOK";

  @IsString()
  @MinLength(2)
  answer!: string;
}

export class OnboardingCompleteDto {
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

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsIn(["M", "F", "OTHER"])
  gender!: "M" | "F" | "OTHER";

  @IsDateString()
  birthDate!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecoveryAnswerDto)
  answers!: RecoveryAnswerDto[];

  @IsOptional()
  @IsString()
  parentClassId?: string;

  @IsOptional()
  @IsString()
  parentStudentId?: string;
}
