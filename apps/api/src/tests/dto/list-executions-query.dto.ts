import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { TestExecutionStatus } from "@prisma/client";

export class ListExecutionsQueryDto {
  @IsOptional()
  @IsEnum(TestExecutionStatus)
  status?: TestExecutionStatus;

  @IsOptional()
  @IsString()
  campaignId?: string;

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
