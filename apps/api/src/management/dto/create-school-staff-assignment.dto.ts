import { IsString } from "class-validator";

export class CreateSchoolStaffAssignmentDto {
  @IsString()
  userId!: string;

  @IsString()
  functionId!: string;
}
