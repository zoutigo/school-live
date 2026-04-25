import { IsOptional, IsString, MinLength } from "class-validator";

export class SearchHelpChaptersDto {
  @IsString()
  @MinLength(1)
  q!: string;

  @IsOptional()
  @IsString()
  guideId?: string;
}
