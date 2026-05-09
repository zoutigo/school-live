import { IsDateString, IsOptional, IsString } from "class-validator";

export class ListHomeworkDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  studentId?: string;
}
