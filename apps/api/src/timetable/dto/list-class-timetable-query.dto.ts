import { IsDateString, IsOptional, IsString } from "class-validator";

export class ListClassTimetableQueryDto {
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
