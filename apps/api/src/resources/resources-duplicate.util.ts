import type { PrismaService } from "../prisma/prisma.service.js";
import type { ResourceExamType, ResourceKind, Sequence } from "@prisma/client";

export const DUPLICATE_BLOCK_THRESHOLD = 0.8;
export const DUPLICATE_WARNING_THRESHOLD = 0.5;

export type DuplicateCandidate = {
  id: string;
  title: string;
  score: number;
};

const COMBINING_DIACRITICS_START = 0x0300;
const COMBINING_DIACRITICS_END = 0x036f;
const COMBINING_DIACRITICS = new RegExp(
  `[${String.fromCharCode(COMBINING_DIACRITICS_START)}-${String.fromCharCode(
    COMBINING_DIACRITICS_END,
  )}]`,
  "g",
);

function normalizeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(value: string): string[] {
  const collapsed = value.replace(/\s+/g, "");
  if (collapsed.length < 2) {
    return collapsed.length === 1 ? [collapsed] : [];
  }
  const grams: string[] = [];
  for (let i = 0; i < collapsed.length - 1; i += 1) {
    grams.push(collapsed.slice(i, i + 2));
  }
  return grams;
}

/**
 * Coefficient de Dice (Sørensen–Dice) sur bigrammes de caractères, après
 * normalisation (casse, accents, ponctuation). Retourne un score entre 0 et 1.
 */
export function titleSimilarity(a: string, b: string): number {
  const normalizedA = normalizeTitle(a);
  const normalizedB = normalizeTitle(b);

  if (!normalizedA && !normalizedB) return 1;
  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;

  const bigramsA = bigrams(normalizedA);
  const bigramsB = bigrams(normalizedB);
  if (bigramsA.length === 0 || bigramsB.length === 0) {
    return normalizedA === normalizedB ? 1 : 0;
  }

  const remaining = new Map<string, number>();
  for (const gram of bigramsA) {
    remaining.set(gram, (remaining.get(gram) ?? 0) + 1);
  }

  let matches = 0;
  for (const gram of bigramsB) {
    const count = remaining.get(gram) ?? 0;
    if (count > 0) {
      matches += 1;
      remaining.set(gram, count - 1);
    }
  }

  return (2 * matches) / (bigramsA.length + bigramsB.length);
}

export type DuplicateSearchCriteria = {
  kind: ResourceKind;
  schoolId?: string | null;
  academicLevelId: string;
  subjectId: string;
  academicYearLabel: string;
  examType: ResourceExamType;
  sequence?: Sequence | null;
  title: string;
  excludeResourceId?: string;
};

/**
 * Cherche des ressources partageant les mêmes critères structurels (école,
 * matière, niveau, année, séquence/type d'examen) et dont le titre est
 * suffisamment proche pour suspecter un doublon. Ne renvoie que les candidats
 * dont le score dépasse DUPLICATE_WARNING_THRESHOLD.
 */
export async function findPotentialDuplicates(
  prisma: PrismaService,
  criteria: DuplicateSearchCriteria,
): Promise<DuplicateCandidate[]> {
  const candidates = await prisma.resource.findMany({
    where: {
      kind: criteria.kind,
      schoolId: criteria.kind === "ASSESSMENT" ? criteria.schoolId : null,
      academicLevelId: criteria.academicLevelId,
      subjectId: criteria.subjectId,
      academicYearLabel: criteria.academicYearLabel,
      examType: criteria.examType,
      sequence: criteria.kind === "ASSESSMENT" ? criteria.sequence : null,
      ...(criteria.excludeResourceId
        ? { id: { not: criteria.excludeResourceId } }
        : {}),
    },
    select: { id: true, title: true },
  });

  return candidates
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      score: titleSimilarity(criteria.title, candidate.title),
    }))
    .filter((candidate) => candidate.score >= DUPLICATE_WARNING_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}
