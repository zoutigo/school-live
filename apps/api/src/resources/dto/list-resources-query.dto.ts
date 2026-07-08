import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ResourceExamType, ResourceKind, Sequence } from "@prisma/client";

export class ListResourcesQueryDto {
  @IsEnum(ResourceKind)
  kind!: ResourceKind;

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
  schoolId?: string;

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
