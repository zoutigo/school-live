import { IsOptional, IsString } from "class-validator";

export class UpdateCurriculumDto {
  @IsOptional()
  @IsString()
  academicLevelId?: string;

  @IsOptional()
  @IsString()
  trackId?: string;
}
