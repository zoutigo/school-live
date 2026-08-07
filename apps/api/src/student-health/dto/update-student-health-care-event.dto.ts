import { StudentHealthAlertLevel } from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateStudentHealthCareEventDto {
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsEnum(StudentHealthAlertLevel)
  alertLevel?: StudentHealthAlertLevel;

  @IsOptional()
  @IsBoolean()
  followUpNeeded?: boolean;
}
