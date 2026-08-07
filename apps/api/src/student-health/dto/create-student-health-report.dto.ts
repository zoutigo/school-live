import {
  StudentHealthAlertLevel,
  StudentHealthReportType,
} from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateStudentHealthReportDto {
  @IsEnum(StudentHealthReportType)
  type!: StudentHealthReportType;

  @IsEnum(StudentHealthAlertLevel)
  alertLevel!: StudentHealthAlertLevel;

  @IsString()
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsBoolean()
  sportRestriction?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
