import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { FeedAudienceScope, FeedPostType } from "@prisma/client";

class UpdateFeedPostAttachmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  sizeLabel?: string;
}

export class UpdateFeedPostDto {
  @IsOptional()
  @IsEnum(FeedPostType)
  type?: FeedPostType;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title!: string;

  @IsString()
  @MinLength(1)
  bodyHtml!: string;

  @IsOptional()
  @IsEnum(FeedAudienceScope)
  audienceScope?: FeedAudienceScope;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  audienceLabel?: string;

  @IsOptional()
  @IsString()
  audienceLevelId?: string;

  @IsOptional()
  @IsString()
  audienceClassId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  featuredDays?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  pollQuestion?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  pollOptions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => UpdateFeedPostAttachmentDto)
  attachments?: UpdateFeedPostAttachmentDto[];
}
