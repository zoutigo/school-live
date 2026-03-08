import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateClassTimetableSlotDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  weekday?: number;

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
  room?: string | null;
}
