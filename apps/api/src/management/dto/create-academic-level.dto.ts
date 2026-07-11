import { SchoolLanguageSystem } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateAcademicLevelDto {
  @IsString()
  code!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  cycleId?: string;

  @IsOptional()
  @IsEnum(SchoolLanguageSystem)
  languageSystem?: SchoolLanguageSystem;
}
