import { Term } from "@prisma/client";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsIn,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class EvaluationAttachmentDto {
  @IsString()
  fileName!: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  sizeLabel?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class CreateEvaluationDto {
  @IsString()
  subjectId!: string;

  @IsOptional()
  @IsString()
  subjectBranchId?: string;

  @IsString()
  evaluationTypeId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0.1)
  coefficient!: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0.1)
  maxScore!: number;

  @IsEnum(Term)
  term!: Term;

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
