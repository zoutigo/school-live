import { IsEnum, IsOptional, IsString } from "class-validator";
import type { HelpGuideAudience } from "@prisma/client";

export class GetCurrentGuideDto {
  @IsOptional()
  @IsString()
  guideId?: string;

  @IsOptional()
  @IsEnum(["PARENT", "TEACHER", "STUDENT", "SCHOOL_ADMIN", "STAFF"])
  audience?: HelpGuideAudience;
}
