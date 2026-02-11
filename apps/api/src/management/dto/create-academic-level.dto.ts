import { IsString } from "class-validator";

export class CreateAcademicLevelDto {
  @IsString()
  code!: string;

  @IsString()
  label!: string;
}
