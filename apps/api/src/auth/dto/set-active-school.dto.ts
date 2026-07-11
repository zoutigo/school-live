import { IsString, MinLength } from "class-validator";

export class SetActiveSchoolDto {
  @IsString()
  @MinLength(1)
  schoolId!: string;
}
