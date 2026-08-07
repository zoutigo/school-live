import { IsOptional, IsString } from "class-validator";

export class ListFeeSchedulesQueryDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsOptional()
  @IsString()
  academicLevelId?: string;
}
