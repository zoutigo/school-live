import { IsIn, IsInt, IsOptional, Min } from "class-validator";
import type { ReinscriptionThresholdPolicy } from "@prisma/client";

const POLICIES: ReinscriptionThresholdPolicy[] = [
  "FIRST_INSTALLMENT",
  "FULL_PAYMENT",
];

export class UpdateFinanceSettingsDto {
  @IsIn(POLICIES)
  reinscriptionThresholdPolicy!: ReinscriptionThresholdPolicy;

  @IsOptional()
  @IsInt()
  @Min(1)
  reinscriptionDeadlineDaysBeforeStart?: number;
}
