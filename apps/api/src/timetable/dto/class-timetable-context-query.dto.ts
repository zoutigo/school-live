import { IsOptional, IsString } from "class-validator";

export class ClassTimetableContextQueryDto {
  @IsOptional()
  @IsString()
  schoolYearId?: string;
}
