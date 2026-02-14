import { IsOptional, IsString } from "class-validator";

export class CreateCurriculumDto {
  @IsString()
  academicLevelId!: string;

  @IsOptional()
  @IsString()
  trackId?: string;
}
