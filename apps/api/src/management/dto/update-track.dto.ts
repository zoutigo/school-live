import { IsOptional, IsString } from "class-validator";

export class UpdateTrackDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  label?: string;
}
