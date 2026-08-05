import { IsString } from "class-validator";

export class AssignEnrollmentToClassDto {
  @IsString()
  classId!: string;
}
