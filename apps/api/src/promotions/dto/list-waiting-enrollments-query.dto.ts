import { IsOptional, IsString } from "class-validator";

export class ListWaitingEnrollmentsQueryDto {
  @IsString()
  schoolYearId!: string;

  @IsOptional()
  @IsString()
  academicLevelId?: string;

  @IsOptional()
  @IsString()
  trackId?: string;
}
