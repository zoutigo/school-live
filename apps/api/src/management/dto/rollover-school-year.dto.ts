import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class RolloverSchoolYearDto {
  @IsOptional()
  @IsString()
  sourceSchoolYearId?: string;

  @IsOptional()
  @IsString()
  targetSchoolYearId?: string;

  @IsOptional()
  @IsString()
  targetLabel?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  setTargetAsActive?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  copyAssignments?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  copyEnrollments?: boolean;
}
