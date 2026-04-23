import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import type { TicketStatus, TicketType } from "@prisma/client";

export class ListTicketsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(["OPEN", "IN_PROGRESS", "ANSWERED", "RESOLVED", "CLOSED"])
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(["BUG", "FEATURE_REQUEST"])
  type?: TicketType;
}
