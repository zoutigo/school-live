import { IsEnum, IsOptional } from "class-validator";
import { Term } from "@prisma/client";

export class ListStudentNotesDto {
  @IsOptional()
  @IsEnum(Term)
  term?: Term;
}
