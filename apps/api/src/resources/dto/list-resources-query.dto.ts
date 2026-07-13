import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { ResourceExamType, ResourceKind, Sequence } from "@prisma/client";

export class ListResourcesQueryDto {
  @IsEnum(ResourceKind)
  kind!: ResourceKind;

  // Par défaut, seules les fiches à énoncé approuvé sont visibles (parcours
  // public). needsStatement bascule vers les fiches en attente d'énoncé (pour
  // les contributeurs qui veulent en proposer un) ; needsCorrection restreint
  // aux fiches à énoncé approuvé mais sans corrigé approuvé.
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  needsStatement?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  needsCorrection?: boolean;

  @IsOptional()
  @IsString()
  academicLevelId?: string;

  @IsOptional()
  @IsString()
  trackId?: string;

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
  schoolId?: string;

  @IsOptional()
  @IsString()
  academicYearLabel?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
