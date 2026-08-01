import { IsIn, IsOptional } from "class-validator";
import {
  LEGAL_DOCUMENT_LOCALES,
  LEGAL_DOCUMENT_SLUGS,
} from "./create-legal-document.dto.js";

export class ListLegalDocumentsDto {
  @IsOptional()
  @IsIn(LEGAL_DOCUMENT_SLUGS)
  slug?: (typeof LEGAL_DOCUMENT_SLUGS)[number];

  @IsOptional()
  @IsIn(LEGAL_DOCUMENT_LOCALES)
  locale?: (typeof LEGAL_DOCUMENT_LOCALES)[number];
}
