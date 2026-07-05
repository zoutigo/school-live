import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { MessageAttachmentDto } from "./message-attachment.dto.js";

export class UpdateDraftMessageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  recipientUserIds?: string[];

  /**
   * Full desired attachment list — replaces all existing attachments on the
   * draft. Undefined leaves attachments untouched; [] clears them.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];
}
