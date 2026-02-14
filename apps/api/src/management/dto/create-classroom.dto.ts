import { IsOptional, IsString } from "class-validator";

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

  @IsString()
  curriculumId!: string;
}
