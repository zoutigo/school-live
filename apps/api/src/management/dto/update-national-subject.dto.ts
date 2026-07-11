import { IsOptional, IsString } from "class-validator";

export class UpdateNationalSubjectDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
