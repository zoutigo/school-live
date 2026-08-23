import { IsDateString, IsString } from "class-validator";

export class UpsertReinscriptionDeadlineDto {
  @IsString()
  schoolYearId!: string;

  @IsString()
  academicLevelId!: string;

  @IsDateString()
  deadline!: string;
}
