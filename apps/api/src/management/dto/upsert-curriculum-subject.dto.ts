import { Type } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class UpsertCurriculumSubjectDto {
  @IsString()
  subjectId!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coefficient?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weeklyHours?: number;
}
