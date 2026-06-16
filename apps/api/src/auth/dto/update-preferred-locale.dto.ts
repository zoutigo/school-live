import { IsIn } from "class-validator";

export class UpdatePreferredLocaleDto {
  @IsIn(["FR", "EN"])
  preferredLocale!: "FR" | "EN";
}
