import { Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import {
  StudentHealthAlertLevel,
  StudentHealthReportType,
} from "@prisma/client";

export const STUDENT_HEALTH_HISTORY_ORIGINS = ["CARE_EVENT", "REPORT"] as const;
export type StudentHealthHistoryOrigin =
  (typeof STUDENT_HEALTH_HISTORY_ORIGINS)[number];

export class GetStudentHealthHistoryQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(StudentHealthAlertLevel)
  alertLevel?: StudentHealthAlertLevel;

  @IsOptional()
  @IsIn(STUDENT_HEALTH_HISTORY_ORIGINS)
  origin?: StudentHealthHistoryOrigin;

  @IsOptional()
  @IsEnum(StudentHealthReportType)
  reportType?: StudentHealthReportType;

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
