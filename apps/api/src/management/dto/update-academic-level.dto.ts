import { IsOptional, IsString } from "class-validator";

export class UpdateAcademicLevelDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  label?: string;
}
