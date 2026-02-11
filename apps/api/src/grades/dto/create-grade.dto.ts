import { Term } from "@prisma/client";
import { IsEnum, IsNumber, IsString, Min } from "class-validator";

export class CreateGradeDto {
  @IsString()
  studentId!: string;

  @IsString()
  classId!: string;

  @IsString()
  subjectId!: string;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsNumber()
  @Min(1)
  maxValue!: number;

  @IsEnum(Term)
  term!: Term;
}
