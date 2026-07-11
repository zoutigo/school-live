import { IsOptional, IsString } from "class-validator";

export class UpdateNationalCycleDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  label?: string;
}
