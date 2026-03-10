import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class UpdateClassTimetableOneOffSlotDto {
  @IsOptional()
  @IsDateString()
  occurrenceDate?: string;

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
  subjectId?: string;

  @IsOptional()
  @IsString()
  teacherUserId?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsIn(["PLANNED", "CANCELLED"])
  status?: "PLANNED" | "CANCELLED";
}
