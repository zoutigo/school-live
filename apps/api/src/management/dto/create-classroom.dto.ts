import { IsOptional, IsString } from "class-validator";

export class CreateClassroomDto {
  @IsString()
  classGroupId!: string;

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
  curriculumId?: string;
}
