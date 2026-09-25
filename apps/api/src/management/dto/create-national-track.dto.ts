import { SchoolLanguageSystem } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateNationalTrackDto {
  @IsString()
  code!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsEnum(SchoolLanguageSystem)
  languageSystem?: SchoolLanguageSystem;
}
