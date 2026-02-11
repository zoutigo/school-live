import { IsOptional, IsString } from "class-validator";

export class UpdateCurriculumDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  academicLevelId?: string;

  @IsOptional()
  @IsString()
  trackId?: string;
}
