import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import type { HelpGuideAudience, HelpPublicationStatus } from "@prisma/client";

export class CreateHelpFaqDto {
  @IsEnum(["PARENT", "TEACHER", "STUDENT", "SCHOOL_ADMIN", "STAFF"])
  audience!: HelpGuideAudience;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: HelpPublicationStatus;
}
