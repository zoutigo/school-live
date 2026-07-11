import { SchoolCycle, SchoolLanguageSystem } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateAcademicLevelDto {
  @IsString()
  code!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsEnum(SchoolCycle)
  cycle?: SchoolCycle;

  @IsOptional()
  @IsEnum(SchoolLanguageSystem)
  languageSystem?: SchoolLanguageSystem;
}
