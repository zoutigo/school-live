import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export const FEED_TYPE_FILTERS = ["featured", "polls"] as const;
export type FeedTypeFilter = (typeof FEED_TYPE_FILTERS)[number];

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

  // Comma-separated combinable type filters (e.g. "featured,polls"), OR'd
  // together in the query — replaces the former single exclusive `filter`.
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string"
      ? value
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry): entry is FeedTypeFilter =>
            (FEED_TYPE_FILTERS as readonly string[]).includes(entry),
          )
      : value,
  )
  @IsIn(FEED_TYPE_FILTERS, { each: true })
  types?: FeedTypeFilter[];

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
