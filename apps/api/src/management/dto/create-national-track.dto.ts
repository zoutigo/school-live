import { IsString } from "class-validator";

export class CreateNationalTrackDto {
  @IsString()
  code!: string;

  @IsString()
  label!: string;
}
