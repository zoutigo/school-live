import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateLegalDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  contentHtml?: string;
}
