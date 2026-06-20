import { IsBoolean, IsOptional, IsString } from "class-validator";

export class ReviewExecutionDto {
  @IsBoolean()
  reviewed!: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
