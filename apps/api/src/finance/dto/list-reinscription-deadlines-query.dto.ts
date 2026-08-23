import { IsOptional, IsString } from "class-validator";

export class ListReinscriptionDeadlinesQueryDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsOptional()
  @IsString()
  academicLevelId?: string;
}
