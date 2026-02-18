import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListMessagesDto {
  @IsOptional()
  @IsIn(["inbox", "sent", "drafts", "archive"])
  folder?: "inbox" | "sent" | "drafts" | "archive";

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
  @Max(100)
  limit?: number;
}
