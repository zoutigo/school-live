import { IsOptional, IsString } from "class-validator";

export class GetSchoolHealthStatsQueryDto {
  @IsOptional()
  @IsString()
  classId?: string;
}
