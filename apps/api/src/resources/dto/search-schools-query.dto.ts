import { IsOptional, IsString, MaxLength } from "class-validator";

export class SearchSchoolsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
