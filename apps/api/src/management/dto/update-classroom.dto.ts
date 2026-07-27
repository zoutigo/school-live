import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateClassroomDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  academicLevelId?: string;

  @IsOptional()
  @IsString()
  trackId?: string;

  @IsOptional()
  @IsString()
  referentTeacherUserId?: string;

  @IsOptional()
  @IsString()
  curriculumId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number | null;
}
