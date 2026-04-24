import { IsEnum, IsOptional, IsString } from "class-validator";
import type { HelpGuideAudience, HelpPublicationStatus } from "@prisma/client";

export class ListHelpGuidesAdminDto {
  @IsOptional()
  @IsEnum(["PARENT", "TEACHER", "STUDENT", "SCHOOL_ADMIN", "STAFF"])
  audience?: HelpGuideAudience;

  @IsOptional()
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: HelpPublicationStatus;

  @IsOptional()
  @IsString()
  schoolId?: string;
}
