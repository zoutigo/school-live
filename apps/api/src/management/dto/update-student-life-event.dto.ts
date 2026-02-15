import { StudentLifeEventType } from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class UpdateStudentLifeEventDto {
  @IsOptional()
  @IsEnum(StudentLifeEventType)
  type?: StudentLifeEventType;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  justified?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
