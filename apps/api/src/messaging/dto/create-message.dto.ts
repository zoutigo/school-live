import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  subject!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  recipientUserIds?: string[];

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}
