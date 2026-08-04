import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateStudentDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  classId!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
