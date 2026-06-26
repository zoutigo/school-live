import { IsEnum, IsOptional } from "class-validator";
import { Sequence, Term } from "@prisma/client";

export class ListStudentNotesDto {
  @IsOptional()
  @IsEnum(Term)
  term?: Term;

  @IsOptional()
  @IsEnum(Sequence)
  sequence?: Sequence;
}
