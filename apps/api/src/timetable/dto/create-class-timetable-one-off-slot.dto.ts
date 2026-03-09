import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CreateClassTimetableOneOffSlotDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsDateString()
  occurrenceDate!: string;

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
  @IsIn(["PLANNED", "CANCELLED"])
  status?: "PLANNED" | "CANCELLED";

  @IsOptional()
  @IsString()
  sourceSlotId?: string;
}
