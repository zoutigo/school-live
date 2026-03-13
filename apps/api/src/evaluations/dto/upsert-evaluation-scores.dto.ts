import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

class EvaluationScoreEntryDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsIn(["ENTERED", "ABSENT", "EXCUSED", "NOT_GRADED"])
  status!: "ENTERED" | "ABSENT" | "EXCUSED" | "NOT_GRADED";
}

export class UpsertEvaluationScoresDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => EvaluationScoreEntryDto)
  scores!: EvaluationScoreEntryDto[];
}
