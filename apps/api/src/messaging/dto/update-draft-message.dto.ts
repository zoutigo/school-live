import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

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
}
