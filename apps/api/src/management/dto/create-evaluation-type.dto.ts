import { IsString } from "class-validator";

export class CreateEvaluationTypeDto {
  @IsString()
  code!: string;

  @IsString()
  label!: string;
}
