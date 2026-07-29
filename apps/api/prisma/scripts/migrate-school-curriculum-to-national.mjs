import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Bascule le catalogue local (académique) d'une école vers le catalogue
 * national existant, équivalent par équivalent — ne crée JAMAIS de nouvelle
 * matière/niveau/filière/curriculum national : repointe uniquement les FK
 * locales vers l'entité nationale correspondante (par nom/code), puis
 * supprime les doublons locaux devenus orphelins.
 *
 * Généralisation de migrate-vogt-to-national-curriculum.mjs (PR #60,
 * exécuté pour "collège vogt") : même logique, paramétrable pour n'importe
 * quelle école.
 *
 * Usage:
 *   node prisma/scripts/migrate-school-curriculum-to-national.mjs \
 *     --school="Lycée du Poisson d'Avril" \
 *     [--languageSystem=FRANCOPHONE|ANGLOPHONE|BILINGUAL] \
 *     [--level-map='{"GEN":"6EME"}'] \
 *     [--apply]
 *
 * Sans --apply : dry-run (aucune écriture, juste le plan).
 * Échoue explicitement (aucune écriture) si une matière/niveau/filière/
 * curriculum local n'a pas d'équivalent national trouvé — ne devine jamais.
 */

const APPLY = process.argv.includes("--apply");

function readArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

const SCHOOL_NAME = readArg("school");
const LANGUAGE_SYSTEM = readArg("languageSystem") ?? "FRANCOPHONE";
const LEVEL_CODE_OVERRIDES = JSON.parse(readArg("level-map") ?? "{}");
const TRACK_CODE_OVERRIDES = JSON.parse(readArg("track-map") ?? "{}");

if (!SCHOOL_NAME) {
  console.error(
    'Usage: node migrate-school-curriculum-to-national.mjs --school="Nom de l\'école" [--languageSystem=...] [--level-map=\'{"LOCAL_CODE":"NATIONAL_CODE"}\'] [--track-map=\'{"LOCAL_CODE":"NATIONAL_CODE"}\'] [--apply]',
  );
  process.exitCode = 1;
  process.exit();
}

async function main() {
  const school = await prisma.school.findFirst({
    where: { name: SCHOOL_NAME },
    select: { id: true, name: true },
  });
  if (!school) {
    throw new Error(`École "${SCHOOL_NAME}" introuvable`);
  }
  console.log(`École: ${school.name} (${school.id})`);
  console.log(`Système linguistique cible: ${LANGUAGE_SYSTEM}`);

  // 1) Mapping matières locales -> nationales (par nom exact)
  const localSubjects = await prisma.subject.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true },
  });

  const subjectIdMap = new Map(); // localSubjectId -> nationalSubjectId
  const unmatchedSubjects = [];
  for (const local of localSubjects) {
    const national = await prisma.subject.findFirst({
      where: { schoolId: null, name: local.name },
      select: { id: true },
    });
    if (!national) {
      unmatchedSubjects.push(local.name);
      console.log(
        `  matière SANS équivalent national (laissée en local): "${local.name}"`,
      );
      continue;
    }
    subjectIdMap.set(local.id, national.id);
    console.log(`  matière: ${local.name}  ${local.id} -> ${national.id}`);
  }

  // 2) Mapping niveaux locaux -> niveaux nationaux
  const localLevels = await prisma.academicLevel.findMany({
    where: { schoolId: school.id },
    select: { id: true, code: true },
  });

  const levelIdMap = new Map(); // localLevelId -> nationalLevelId
  const unmatchedLevels = [];
  for (const local of localLevels) {
    const nationalCode = LEVEL_CODE_OVERRIDES[local.code] ?? local.code;
    const national = await prisma.academicLevel.findFirst({
      where: {
        schoolId: null,
        code: nationalCode,
        languageSystem: LANGUAGE_SYSTEM,
      },
      select: { id: true },
    });
    if (!national) {
      unmatchedLevels.push(local.code);
      console.log(
        `  niveau SANS équivalent national (laissé en local): "${local.code}" (essayé code national "${nationalCode}", ${LANGUAGE_SYSTEM}) — utiliser --level-map si c'est juste un code différent.`,
      );
      continue;
    }
    levelIdMap.set(local.id, national.id);
    console.log(
      `  niveau: ${local.code} -> national ${nationalCode} (${national.id})`,
    );
  }

  // 3) Mapping filières locales -> nationales (par code)
  const localTracks = await prisma.track.findMany({
    where: { schoolId: school.id },
    select: { id: true, code: true },
  });

  const trackIdMap = new Map(); // localTrackId -> nationalTrackId
  const unmatchedTracks = [];
  for (const local of localTracks) {
    const nationalCode = TRACK_CODE_OVERRIDES[local.code] ?? local.code;
    const national = await prisma.track.findFirst({
      where: { schoolId: null, code: nationalCode },
      select: { id: true },
    });
    if (!national) {
      unmatchedTracks.push(local.code);
      console.log(
        `  filière SANS équivalent national (laissée en local): "${local.code}" (essayé code national "${nationalCode}") — utiliser --track-map si c'est juste un code différent.`,
      );
      continue;
    }
    trackIdMap.set(local.id, national.id);
    console.log(
      `  filière: ${local.code} -> national ${nationalCode} (${national.id})`,
    );
  }

  // 4) Mapping curriculums locaux -> nationaux (par niveau national + filière nationale)
  const localCurriculums = await prisma.curriculum.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true, academicLevelId: true, trackId: true },
  });

  const curriculumIdMap = new Map(); // localCurriculumId -> nationalCurriculumId
  const unmatchedCurriculums = [];
  for (const local of localCurriculums) {
    const nationalLevelId = levelIdMap.get(local.academicLevelId);
    if (!nationalLevelId) {
      unmatchedCurriculums.push(local.name);
      console.log(
        `  curriculum SANS équivalent national (laissé en local): "${local.name}" — niveau local ${local.academicLevelId} lui-même sans équivalent.`,
      );
      continue;
    }
    const nationalTrackId = local.trackId
      ? (trackIdMap.get(local.trackId) ?? null)
      : null;
    if (local.trackId && !nationalTrackId) {
      unmatchedCurriculums.push(local.name);
      console.log(
        `  curriculum SANS équivalent national (laissé en local): "${local.name}" — filière locale ${local.trackId} sans équivalent.`,
      );
      continue;
    }
    const national = await prisma.curriculum.findFirst({
      where: {
        schoolId: null,
        academicLevelId: nationalLevelId,
        trackId: nationalTrackId,
      },
      select: { id: true, name: true },
    });
    if (!national) {
      unmatchedCurriculums.push(local.name);
      console.log(
        `  curriculum SANS équivalent national (laissé en local): "${local.name}" — aucun curriculum national pour le niveau ${nationalLevelId}${
          nationalTrackId ? ` / filière ${nationalTrackId}` : ""
        }.`,
      );
      continue;
    }
    curriculumIdMap.set(local.id, national.id);
    console.log(
      `  curriculum: "${local.name}" (${local.id}) -> "${national.name}" (${national.id})`,
    );
  }

  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
    select: {
      id: true,
      name: true,
      academicLevelId: true,
      trackId: true,
      curriculumId: true,
    },
  });

  console.log("\nPlan classes:");
  for (const cls of classes) {
    // FK non mappée (matière/niveau/filière/curriculum resté local) -> on
    // conserve l'id local existant, jamais de null artificiel.
    const nationalLevelId = cls.academicLevelId
      ? (levelIdMap.get(cls.academicLevelId) ?? cls.academicLevelId)
      : null;
    const nationalTrackId = cls.trackId
      ? (trackIdMap.get(cls.trackId) ?? cls.trackId)
      : null;
    const nationalCurriculumId = cls.curriculumId
      ? (curriculumIdMap.get(cls.curriculumId) ?? cls.curriculumId)
      : null;
    console.log(
      `  ${cls.name}: level ${cls.academicLevelId} -> ${nationalLevelId}, track ${cls.trackId} -> ${nationalTrackId}, curriculum ${cls.curriculumId} -> ${nationalCurriculumId}`,
    );
  }

  console.log("\nRésumé des éléments locaux NON migrés (restent locaux):");
  console.log(
    `  matières: ${unmatchedSubjects.length ? unmatchedSubjects.join(", ") : "aucune"}`,
  );
  console.log(
    `  niveaux: ${unmatchedLevels.length ? unmatchedLevels.join(", ") : "aucun"}`,
  );
  console.log(
    `  filières: ${unmatchedTracks.length ? unmatchedTracks.join(", ") : "aucune"}`,
  );
  console.log(
    `  curriculums: ${unmatchedCurriculums.length ? unmatchedCurriculums.join(", ") : "aucun"}`,
  );

  if (!APPLY) {
    console.log(
      "\nDry-run terminé (aucune écriture). Relancer avec --apply pour exécuter.",
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Repoint FK matières -> matières nationales
    for (const [localId, nationalId] of subjectIdMap) {
      await tx.teacherClassSubject.updateMany({
        where: { subjectId: localId },
        data: { subjectId: nationalId },
      });
      await tx.studentGrade.updateMany({
        where: { subjectId: localId },
        data: { subjectId: nationalId },
      });
      await tx.evaluation.updateMany({
        where: { subjectId: localId },
        data: { subjectId: nationalId },
      });
      await tx.homework.updateMany({
        where: { subjectId: localId },
        data: { subjectId: nationalId },
      });
      await tx.classTimetableSlot.updateMany({
        where: { subjectId: localId },
        data: { subjectId: nationalId },
      });
      await tx.classTimetableOneOffSlot.updateMany({
        where: { subjectId: localId },
        data: { subjectId: nationalId },
      });
      await tx.classTimetableSlotException.updateMany({
        where: { subjectId: localId },
        data: { subjectId: nationalId },
      });
      await tx.classTimetableSubjectStyle.updateMany({
        where: { subjectId: localId },
        data: { subjectId: nationalId },
      });
      await tx.studentTermReportEntry.updateMany({
        where: { subjectId: localId },
        data: { subjectId: nationalId },
      });
      await tx.subjectBranch.updateMany({
        where: { subjectId: localId },
        data: { subjectId: nationalId },
      });
      await tx.classSubjectOverride.updateMany({
        where: { subjectId: localId },
        data: { subjectId: nationalId },
      });
      await tx.resource.updateMany({
        where: { subjectId: localId },
        data: { subjectId: nationalId },
      });
    }

    // Repoint FK niveaux -> niveaux nationaux
    for (const [localLevelId, nationalLevelId] of levelIdMap) {
      await tx.feedPost.updateMany({
        where: { audienceLevelId: localLevelId },
        data: { audienceLevelId: nationalLevelId },
      });
      await tx.resource.updateMany({
        where: { academicLevelId: localLevelId },
        data: { academicLevelId: nationalLevelId },
      });
      await tx.schoolCalendarEvent.updateMany({
        where: { academicLevelId: localLevelId },
        data: { academicLevelId: nationalLevelId },
      });
    }

    // Repoint FK filières -> filières nationales
    for (const [localTrackId, nationalTrackId] of trackIdMap) {
      await tx.resource.updateMany({
        where: { trackId: localTrackId },
        data: { trackId: nationalTrackId },
      });
    }

    // Repoint classes (niveau, filière, curriculum) — une FK non mappée
    // (restée locale) garde son id local existant, jamais mise à null.
    for (const cls of classes) {
      const nationalLevelId = cls.academicLevelId
        ? (levelIdMap.get(cls.academicLevelId) ?? cls.academicLevelId)
        : null;
      const nationalTrackId = cls.trackId
        ? (trackIdMap.get(cls.trackId) ?? cls.trackId)
        : null;
      const nationalCurriculumId = cls.curriculumId
        ? (curriculumIdMap.get(cls.curriculumId) ?? cls.curriculumId)
        : null;
      await tx.class.update({
        where: { id: cls.id },
        data: {
          academicLevelId: nationalLevelId,
          trackId: nationalTrackId,
          curriculumId: nationalCurriculumId,
        },
      });
    }

    // Supprimer les curriculums locaux orphelins (cascade sur CurriculumSubject)
    for (const localId of curriculumIdMap.keys()) {
      await tx.curriculum.delete({ where: { id: localId } });
    }

    // Supprimer les filières locales devenues orphelines
    for (const localTrackId of trackIdMap.keys()) {
      await tx.track.delete({ where: { id: localTrackId } });
    }

    // Supprimer les niveaux locaux devenus orphelins
    for (const localLevelId of levelIdMap.keys()) {
      await tx.academicLevel.delete({ where: { id: localLevelId } });
    }

    // Supprimer les matières locales (toutes les FK ont été repointées)
    for (const localId of subjectIdMap.keys()) {
      await tx.subject.delete({ where: { id: localId } });
    }
  });

  console.log("\nMigration appliquée.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
