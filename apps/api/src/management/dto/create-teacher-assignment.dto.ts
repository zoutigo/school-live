import { IsString } from "class-validator";

export class CreateTeacherAssignmentDto {
  @IsString()
  schoolYearId!: string;

  @IsString()
  teacherUserId!: string;

  @IsString()
  classId!: string;

  @IsString()
  subjectId!: string;
}
