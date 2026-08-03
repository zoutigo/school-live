import { StudentHealthAlertLevel } from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateStudentHealthCareEventDto {
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsString()
  @MaxLength(200)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsEnum(StudentHealthAlertLevel)
  alertLevel!: StudentHealthAlertLevel;

  @IsOptional()
  @IsBoolean()
  followUpNeeded?: boolean;
}
