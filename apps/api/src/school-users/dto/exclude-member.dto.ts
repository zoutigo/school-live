import { IsOptional, IsString, MaxLength } from "class-validator";

export class ExcludeMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
