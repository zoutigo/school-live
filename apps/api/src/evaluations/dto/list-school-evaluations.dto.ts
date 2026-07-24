import { IsOptional, IsString } from "class-validator";

export class ListSchoolEvaluationsDto {
  @IsOptional()
  @IsString()
  academicLevelId?: string;

  @IsOptional()
  @IsString()
  classId?: string;
}
