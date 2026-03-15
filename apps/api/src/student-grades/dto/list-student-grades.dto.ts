import { IsOptional, IsString } from "class-validator";

export class ListStudentGradesDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;
}
