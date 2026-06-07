import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsIn,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

class RecoverUsernameAnswerDto {
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

export class RecoverUsernameVerifyDto {
  @IsString()
  @MinLength(1)
  username!: string;

  @IsDateString()
  birthDate!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecoverUsernameAnswerDto)
  answers!: RecoverUsernameAnswerDto[];
}
