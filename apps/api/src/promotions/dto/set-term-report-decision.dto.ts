import { PromotionDecision } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class SetTermReportDecisionDto {
  @IsEnum(PromotionDecision)
  decision!: PromotionDecision;

  @IsOptional()
  @IsString()
  nextAcademicLevelId?: string;

  @IsOptional()
  @IsString()
  nextTrackId?: string;
}
