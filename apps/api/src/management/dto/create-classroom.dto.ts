import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateClassroomDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  academicLevelId?: string;

  @IsOptional()
  @IsString()
  trackId?: string;

  @IsOptional()
  @IsString()
  referentTeacherUserId?: string;

  @IsString()
  curriculumId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
