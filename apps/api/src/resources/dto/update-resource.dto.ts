import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ResourceExamType, Sequence } from "@prisma/client";
import { ResourceAttachmentDto } from "./create-resource.dto.js";

export class UpdateResourceDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  academicLevelId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsEnum(ResourceExamType)
  examType?: ResourceExamType;

  @IsOptional()
  @IsEnum(Sequence)
  sequence?: Sequence;

  @IsOptional()
  @IsString()
  @MaxLength(9)
  academicYearLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  statementContent?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ResourceAttachmentDto)
  statementAttachments?: ResourceAttachmentDto[];

  @IsOptional()
  @IsString()
  correctionContent?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ResourceAttachmentDto)
  correctionAttachments?: ResourceAttachmentDto[];
}
