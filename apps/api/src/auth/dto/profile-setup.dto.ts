import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

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

export class ProfileSetupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

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
