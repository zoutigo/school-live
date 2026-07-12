import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListSchoolsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(["PRIMARY", "SECONDARY"])
  cycle?: "PRIMARY" | "SECONDARY";

  @IsOptional()
  @IsIn(["FRANCOPHONE", "ANGLOPHONE", "BILINGUAL"])
  languageSystem?: "FRANCOPHONE" | "ANGLOPHONE" | "BILINGUAL";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
