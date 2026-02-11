import { IsOptional, IsString } from "class-validator";

export class CreateCurriculumDto {
  @IsString()
  name!: string;

  @IsString()
  academicLevelId!: string;

  @IsOptional()
  @IsString()
  trackId?: string;
}
