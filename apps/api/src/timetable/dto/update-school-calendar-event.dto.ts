import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

export class UpdateSchoolCalendarEventDto {
  @IsOptional()
  @IsIn(["HOLIDAY"])
  type?: "HOLIDAY";

  @IsOptional()
  @IsIn(["SCHOOL", "ACADEMIC_LEVEL", "CLASS"])
  scope?: "SCHOOL" | "ACADEMIC_LEVEL" | "CLASS";

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  academicLevelId?: string;

  @IsOptional()
  @IsString()
  classId?: string;
}
