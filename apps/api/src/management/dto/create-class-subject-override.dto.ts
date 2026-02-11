import { OverrideAction } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateClassSubjectOverrideDto {
  @IsString()
  subjectId!: string;

  @IsEnum(OverrideAction)
  action!: OverrideAction;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coefficientOverride?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weeklyHoursOverride?: number;
}
