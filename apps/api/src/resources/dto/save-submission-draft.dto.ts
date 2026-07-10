import {
  ArrayMaxSize,
  IsArray,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ResourceAttachmentDto } from "./create-resource.dto.js";

export class SaveSubmissionDraftDto {
  @IsString()
  content!: string;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ResourceAttachmentDto)
  attachments: ResourceAttachmentDto[] = [];
}
