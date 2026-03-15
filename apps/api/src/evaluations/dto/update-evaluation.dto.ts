import { Term } from "@prisma/client";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { EvaluationAttachmentDto } from "./create-evaluation.dto.js";

export class UpdateEvaluationDto {
  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  subjectBranchId?: string;

  @IsOptional()
  @IsString()
  evaluationTypeId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  coefficient?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  maxScore?: number;

  @IsOptional()
  @IsEnum(Term)
  term?: Term;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => EvaluationAttachmentDto)
  attachments?: EvaluationAttachmentDto[];

  @IsOptional()
  @IsIn(["DRAFT", "PUBLISHED"])
  status?: "DRAFT" | "PUBLISHED";
}
