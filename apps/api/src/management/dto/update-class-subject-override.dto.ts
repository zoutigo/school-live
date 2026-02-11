import { OverrideAction } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateClassSubjectOverrideDto {
  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsEnum(OverrideAction)
  action?: OverrideAction;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coefficientOverride?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weeklyHoursOverride?: number;
}
