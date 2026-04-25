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

export class CreateHelpFaqItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsString()
  @MaxLength(240)
  question!: string;

  @IsString()
  answerHtml!: string;

  @IsOptional()
  answerJson?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: HelpPublicationStatus;
}
