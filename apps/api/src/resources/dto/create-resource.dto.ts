import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { ResourceExamType, ResourceKind, Sequence } from "@prisma/client";

export class ResourceAttachmentDto {
  @IsString()
  fileName!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  sizeLabel?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

// La création ne porte plus que les métadonnées de la fiche : l'énoncé et le
// corrigé sont saisis séparément par n'importe quel contributeur via le
// circuit de soumissions (voir SaveSubmissionDraftDto).
export class CreateResourceDto {
  @IsEnum(ResourceKind)
  kind!: ResourceKind;

  @ValidateIf((dto: CreateResourceDto) => dto.kind === "ASSESSMENT")
  @IsString()
  schoolId?: string;

  @IsString()
  academicLevelId!: string;

  @IsString()
  subjectId!: string;

  @IsEnum(ResourceExamType)
  examType!: ResourceExamType;

  @ValidateIf((dto: CreateResourceDto) => dto.kind === "ASSESSMENT")
  @IsEnum(Sequence)
  sequence?: Sequence;

  @IsString()
  @MaxLength(9)
  academicYearLabel!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  // Si un doublon potentiel (score de similarité entre 50% et 80%) a déjà été
  // signalé par une première tentative de création, le client renvoie ce flag
  // pour confirmer explicitement la création malgré l'avertissement.
  @IsOptional()
  @IsBoolean()
  confirmDuplicate?: boolean;
}
