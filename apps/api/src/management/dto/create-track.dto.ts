import { IsString } from "class-validator";

export class CreateTrackDto {
  @IsString()
  code!: string;

  @IsString()
  label!: string;
}
