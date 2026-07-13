import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { ResourceExamType, Sequence } from "@prisma/client";

// Le contenu (énoncé/corrigé) ne s'édite plus ici : il passe par le circuit de
// soumissions (brouillon -> soumission -> approbation). Cet endpoint ne touche
// plus qu'aux métadonnées de la fiche.
export class UpdateResourceDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  academicLevelId?: string;

  @IsOptional()
  @IsString()
  trackId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsEnum(ResourceExamType)
  examType?: ResourceExamType;

  @IsOptional()
  @IsEnum(Sequence)
  sequence?: Sequence;

  @IsOptional()
  @IsString()
  @MaxLength(9)
  academicYearLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
