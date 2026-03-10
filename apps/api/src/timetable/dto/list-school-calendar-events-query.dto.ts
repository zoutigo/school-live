import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

export class ListSchoolCalendarEventsQueryDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsOptional()
  @IsIn(["SCHOOL", "ACADEMIC_LEVEL", "CLASS"])
  scope?: "SCHOOL" | "ACADEMIC_LEVEL" | "CLASS";

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  academicLevelId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
