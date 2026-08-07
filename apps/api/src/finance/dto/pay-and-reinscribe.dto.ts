import { IsString } from "class-validator";

export class PayAndReinscribeDto {
  @IsString()
  studentId!: string;

  @IsString()
  schoolYearId!: string;
}
