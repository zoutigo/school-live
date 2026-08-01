import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export const LEGAL_DOCUMENT_SLUGS = [
  "cgu",
  "mentions-legales",
  "confidentialite",
] as const;

export const LEGAL_DOCUMENT_LOCALES = ["fr", "en"] as const;

export class CreateLegalDocumentDto {
  @IsIn(LEGAL_DOCUMENT_SLUGS)
  slug!: (typeof LEGAL_DOCUMENT_SLUGS)[number];

  @IsIn(LEGAL_DOCUMENT_LOCALES)
  locale!: (typeof LEGAL_DOCUMENT_LOCALES)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  contentHtml!: string;
}
