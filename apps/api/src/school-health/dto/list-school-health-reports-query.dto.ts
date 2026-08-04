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
import {
  StudentHealthAlertLevel,
  StudentHealthReportType,
} from "@prisma/client";

export class ListSchoolHealthReportsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(StudentHealthAlertLevel)
  alertLevel?: StudentHealthAlertLevel;

  @IsOptional()
  @IsEnum(StudentHealthReportType)
  reportType?: StudentHealthReportType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  acknowledged?: boolean;

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
