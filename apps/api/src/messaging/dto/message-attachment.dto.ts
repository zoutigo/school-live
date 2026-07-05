import {
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class MessageAttachmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MinLength(1)
  fileUrl!: string;

  @IsString()
  @MinLength(1)
  mimeType!: string;

  @IsInt()
  @IsPositive()
  sizeBytes!: number;
}
