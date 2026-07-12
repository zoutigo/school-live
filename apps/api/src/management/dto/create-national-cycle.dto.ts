import { IsString } from "class-validator";

export class CreateNationalCycleDto {
  @IsString()
  code!: string;

  @IsString()
  label!: string;
}
