import { IsOptional, IsString, MaxLength } from "class-validator";

export class AssignCampaignDto {
  @IsString()
  testerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
