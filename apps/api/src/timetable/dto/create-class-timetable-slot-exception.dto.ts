import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CreateClassTimetableSlotExceptionDto {
  @IsDateString()
  occurrenceDate!: string;

  @IsIn(["OVERRIDE", "CANCEL"])
  type!: "OVERRIDE" | "CANCEL";

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  teacherUserId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute?: number;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
