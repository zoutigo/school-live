import {
  StudentHealthAlertLevel,
  StudentHealthConditionType,
} from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateStudentHealthConditionDto {
  @IsEnum(StudentHealthConditionType)
  type!: StudentHealthConditionType;

  @IsEnum(StudentHealthAlertLevel)
  alertLevel!: StudentHealthAlertLevel;

  @IsString()
  @MaxLength(200)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  emergencyInstructions?: string;

  @IsOptional()
  @IsBoolean()
  isVisibleToAllTeachers?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  publicAlertLabel?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
