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

export class UpdateHelpFaqThemeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: HelpPublicationStatus;
}
