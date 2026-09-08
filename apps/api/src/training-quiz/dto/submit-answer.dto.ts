import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

export class SubmitAnswerDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  optionIds!: string[];
}
