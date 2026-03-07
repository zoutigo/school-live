import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
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

export class ForgotPinVerifyDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  phone?: string;

  @IsDateString()
  birthDate!: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => RecoveryAnswerDto)
  answers!: RecoveryAnswerDto[];
}
