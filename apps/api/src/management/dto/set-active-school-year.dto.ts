import { IsString } from "class-validator";

export class SetActiveSchoolYearDto {
  @IsString()
  schoolYearId!: string;
}
