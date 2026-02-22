import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListFeedPostsDto {
  @IsOptional()
  @IsIn(["GENERAL", "CLASS"])
  viewScope?: "GENERAL" | "CLASS";

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  levelId?: string;

  @IsOptional()
  @IsIn(["all", "featured", "polls"])
  filter?: "all" | "featured" | "polls";

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
