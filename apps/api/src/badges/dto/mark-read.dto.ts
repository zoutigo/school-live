import { IsIn, IsOptional, IsString } from "class-validator";
import type { BadgeScope } from "@prisma/client";

const BADGE_SCOPES: BadgeScope[] = ["NOTES", "FEED", "TICKETS", "DISCIPLINE"];

export class MarkReadDto {
  @IsIn(BADGE_SCOPES)
  scope!: BadgeScope;

  // Optional because FEED is scoped to the current school, resolved
  // server-side from the route — the client doesn't know the internal
  // school id, only its slug.
  @IsOptional()
  @IsString()
  scopeRefId?: string;
}
