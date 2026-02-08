import { Term } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateGradeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxValue?: number;

  @IsOptional()
  @IsEnum(Term)
  term?: Term;
}
