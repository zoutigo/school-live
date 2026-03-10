import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

export class CreateSchoolCalendarEventDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsOptional()
  @IsIn(["HOLIDAY"])
  type?: "HOLIDAY";

  @IsIn(["SCHOOL", "ACADEMIC_LEVEL", "CLASS"])
  scope!: "SCHOOL" | "ACADEMIC_LEVEL" | "CLASS";

  @IsString()
  label!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  academicLevelId?: string;

  @IsOptional()
  @IsString()
  classId?: string;
}
