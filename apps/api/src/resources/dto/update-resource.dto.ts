import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ResourceAttachmentDto } from "./create-resource.dto.js";

export class UpdateResourceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  statementContent?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ResourceAttachmentDto)
  statementAttachments?: ResourceAttachmentDto[];

  @IsOptional()
  @IsString()
  correctionContent?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ResourceAttachmentDto)
  correctionAttachments?: ResourceAttachmentDto[];
}
