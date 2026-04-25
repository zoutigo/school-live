import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import type { HelpPublicationStatus } from "@prisma/client";

export class UpdateHelpFaqItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  question?: string;

  @IsOptional()
  @IsString()
  answerHtml?: string;

  @IsOptional()
  answerJson?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: HelpPublicationStatus;
}
