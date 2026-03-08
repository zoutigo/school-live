import { IsDateString, IsOptional, IsString } from "class-validator";

export class ListMyTimetableQueryDto {
  @IsOptional()
  @IsString()
  childId?: string;

  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
