import { IsOptional, IsString } from "class-validator";

export class ListSupplyListsQueryDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;

  @IsOptional()
  @IsString()
  academicLevelId?: string;
}
