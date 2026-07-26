import { IsDateString, IsOptional, IsString } from "class-validator";

export class ListMyTimetableQueryDto {
  @IsOptional()
  @IsString()
  childId?: string;

  /** Admin (SCHOOL_ADMIN/SCHOOL_MANAGER/SUPERVISOR/SUPER_ADMIN) viewing an arbitrary student's schedule. */
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  teacherUserId?: string;

  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
