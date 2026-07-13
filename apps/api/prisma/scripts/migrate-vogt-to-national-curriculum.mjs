import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Bascule "collège vogt" du catalogue local vers le catalogue national FRANCOPHONE.
 * - repointe toutes les FK des matières locales vers leurs équivalents nationaux (par nom)
 * - repointe classes (academicLevelId, curriculumId) et FeedPost.audienceLevelId vers les niveaux nationaux
 * - supprime ensuite les Curriculum/CurriculumSubject/AcademicLevel/Subject locaux devenus orphelins
 *
 * Usage: node prisma/scripts/migrate-vogt-to-national-curriculum.mjs [--apply]
 * Sans --apply : dry-run (aucune écriture, juste le plan).
 */

const SCHOOL_NAME = "collège vogt";
const APPLY = process.argv.includes("--apply");

const LEVEL_MAP = {
  GEN: "6EME", // classe 6eA rattachée à un niveau local bricolé "GEN" -> normalisé en 6EME
  "6EME": "6EME",
  "5EME": "5EME",
  "4EME": "4EME",
};

async function main() {
  const school = await prisma.school.findFirst({
    where: { name: SCHOOL_NAME },
    select: { id: true, name: true },
  });
  if (!school) {
    throw new Error(`École "${SCHOOL_NAME}" introuvable`);
  }
  console.log(`École: ${school.name} (${school.id})`);

  // 1) Mapping matières locales -> nationales (par nom exact)
  const localSubjects = await prisma.subject.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true },
  });

  const subjectIdMap = new Map(); // localSubjectId -> nationalSubjectId
  for (const local of localSubjects) {
    const national = await prisma.subject.findFirst({
      where: { schoolId: null, name: local.name },
      select: { id: true },
    });
    if (!national) {
      throw new Error(
        `Aucune matière nationale correspondant à "${local.name}" — arrêt.`,
      );
    }
    subjectIdMap.set(local.id, national.id);
    console.log(`  matière: ${local.name}  ${local.id} -> ${national.id}`);
  }

  // 2) Mapping niveaux locaux -> niveaux nationaux (FRANCOPHONE)
  const localLevels = await prisma.academicLevel.findMany({
    where: { schoolId: school.id },
    select: { id: true, code: true },
  });

  const levelIdMap = new Map(); // localLevelId -> nationalLevelId
  for (const local of localLevels) {
    const nationalCode = LEVEL_MAP[local.code];
    if (!nationalCode) {
      throw new Error(
        `Pas de mapping national pour le niveau local "${local.code}" — arrêt.`,
      );
    }
    const national = await prisma.academicLevel.findFirst({
      where: {
        schoolId: null,
        code: nationalCode,
        languageSystem: "FRANCOPHONE",
      },
      select: { id: true },
    });
    if (!national) {
      throw new Error(`Niveau national "${nationalCode}" introuvable — arrêt.`);
    }
    levelIdMap.set(local.id, national.id);
    console.log(
      `  niveau: ${local.code} -> national ${nationalCode} (${national.id})`,
    );
  }

  // 3) Mapping curriculum national par niveau (TRONC_COMMUN)
  const curriculumIdByLevel = new Map(); // nationalLevelId -> nationalCurriculumId
  for (const nationalLevelId of new Set(levelIdMap.values())) {
    const curriculum = await prisma.curriculum.findFirst({
      where: { schoolId: null, academicLevelId: nationalLevelId },
      select: { id: true, name: true },
    });
    if (!curriculum) {
      throw new Error(
        `Curriculum national introuvable pour le niveau ${nationalLevelId}`,
      );
    }
    curriculumIdByLevel.set(nationalLevelId, curriculum.id);
  }

  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true, academicLevelId: true, curriculumId: true },
  });

  console.log("\nPlan classes:");
  for (const cls of classes) {
    const nationalLevelId = cls.academicLevelId
      ? levelIdMap.get(cls.academicLevelId)
      : null;
    const nationalCurriculumId = nationalLevelId
      ? curriculumIdByLevel.get(nationalLevelId)
      : null;
    console.log(
      `  ${cls.name}: academicLevelId ${cls.academicLevelId} -> ${nationalLevelId}, curriculumId ${cls.curriculumId} -> ${nationalCurriculumId}`,
    );
  }

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
    }

    // Repoint FeedPost.audienceLevelId -> niveau national
    for (const [localLevelId, nationalLevelId] of levelIdMap) {
      await tx.feedPost.updateMany({
        where: { audienceLevelId: localLevelId },
        data: { audienceLevelId: nationalLevelId },
      });
    }

    // Repoint classes
    for (const cls of classes) {
      const nationalLevelId = cls.academicLevelId
        ? levelIdMap.get(cls.academicLevelId)
        : null;
      const nationalCurriculumId = nationalLevelId
        ? curriculumIdByLevel.get(nationalLevelId)
        : null;
      await tx.class.update({
        where: { id: cls.id },
        data: {
          academicLevelId: nationalLevelId,
          curriculumId: nationalCurriculumId,
        },
      });
    }

    // Supprimer les curriculums locaux orphelins (cascade sur CurriculumSubject)
    const localCurriculums = await tx.curriculum.findMany({
      where: { schoolId: school.id },
      select: { id: true },
    });
    for (const curriculum of localCurriculums) {
      await tx.curriculum.delete({ where: { id: curriculum.id } });
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
