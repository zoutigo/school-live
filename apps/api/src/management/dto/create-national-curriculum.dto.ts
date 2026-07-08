import { IsString } from "class-validator";

export class CreateNationalCurriculumDto {
  @IsString()
  academicLevelId!: string;
}
