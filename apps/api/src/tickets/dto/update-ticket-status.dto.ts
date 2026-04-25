import { IsEnum } from "class-validator";
import type { TicketStatus } from "@prisma/client";

export class UpdateTicketStatusDto {
  @IsEnum(["OPEN", "IN_PROGRESS", "ANSWERED", "RESOLVED", "CLOSED"])
  status!: TicketStatus;
}
