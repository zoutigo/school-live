import { IsOptional, IsString } from "class-validator";

export class CreateNationalCurriculumDto {
  @IsString()
  academicLevelId!: string;

  @IsOptional()
  @IsString()
  trackId?: string;
}
