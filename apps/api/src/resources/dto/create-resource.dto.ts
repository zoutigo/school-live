import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ResourceExamType, ResourceKind, Sequence } from "@prisma/client";

export class ResourceAttachmentDto {
  @IsString()
  fileName!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  sizeLabel?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class CreateResourceDto {
  @IsEnum(ResourceKind)
  kind!: ResourceKind;

  @ValidateIf((dto: CreateResourceDto) => dto.kind === "ASSESSMENT")
  @IsString()
  schoolId?: string;

  @IsString()
  academicLevelId!: string;

  @IsString()
  subjectId!: string;

  @IsEnum(ResourceExamType)
  examType!: ResourceExamType;

  @ValidateIf((dto: CreateResourceDto) => dto.kind === "ASSESSMENT")
  @IsEnum(Sequence)
  sequence?: Sequence;

  @IsString()
  @MaxLength(9)
  academicYearLabel!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  statementContent!: string;

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
