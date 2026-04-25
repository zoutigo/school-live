import { IsString, MinLength } from "class-validator";

export class SearchHelpFaqItemsDto {
  @IsString()
  @MinLength(1)
  q!: string;
}
