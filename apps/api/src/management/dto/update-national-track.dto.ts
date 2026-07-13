import { IsOptional, IsString } from "class-validator";

export class UpdateNationalTrackDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  label?: string;
}
