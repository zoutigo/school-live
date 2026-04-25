import { IsEnum, IsOptional, IsString } from "class-validator";
import type { HelpGuideAudience } from "@prisma/client";

export class GetCurrentHelpFaqDto {
  @IsOptional()
  @IsString()
  faqId?: string;

  @IsOptional()
  @IsEnum(["PARENT", "TEACHER", "STUDENT", "SCHOOL_ADMIN", "STAFF"])
  audience?: HelpGuideAudience;
}
