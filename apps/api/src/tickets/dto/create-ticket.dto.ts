import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import type { TicketType } from "@prisma/client";

export class CreateTicketDto {
  @IsEnum(["BUG", "FEATURE_REQUEST"])
  type!: TicketType;

  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsString()
  schoolSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  screenPath?: string;
}
