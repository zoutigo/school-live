import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CreateClassTimetableSlotDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsInt()
  @Min(1)
  @Max(7)
  weekday!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute!: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute!: number;

  @IsString()
  subjectId!: string;

  @IsString()
  teacherUserId!: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsDateString()
  activeFromDate?: string;

  @IsOptional()
  @IsDateString()
  activeToDate?: string;
}
