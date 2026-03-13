import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

class UpsertTermReportSubjectDto {
  @IsString()
  subjectId!: string;

  @IsOptional()
  @IsString()
  appreciation?: string;
}

class UpsertStudentTermReportDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  generalAppreciation?: string;

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => UpsertTermReportSubjectDto)
  subjects!: UpsertTermReportSubjectDto[];
}

export class UpsertTermReportsDto {
  @IsOptional()
  @IsDateString()
  councilHeldAt?: string;

  @IsOptional()
  @IsIn(["DRAFT", "PUBLISHED"])
  status?: "DRAFT" | "PUBLISHED";

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => UpsertStudentTermReportDto)
  reports!: UpsertStudentTermReportDto[];
}
