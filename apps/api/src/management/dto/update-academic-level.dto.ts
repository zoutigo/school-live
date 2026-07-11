import { SchoolLanguageSystem } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateAcademicLevelDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  cycleId?: string;

  @IsOptional()
  @IsEnum(SchoolLanguageSystem)
  languageSystem?: SchoolLanguageSystem;
}
