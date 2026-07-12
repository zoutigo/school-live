import { IsOptional, IsString } from "class-validator";

export class UpdateNationalCurriculumDto {
  @IsOptional()
  @IsString()
  academicLevelId?: string;
}
