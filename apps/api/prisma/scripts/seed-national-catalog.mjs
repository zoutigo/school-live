import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

/**
 * Les 4 catalogues nationaux (cycle x languageSystem) à créer.
 * Chaque niveau produit : AcademicLevel national, Curriculum "TRONC_COMMUN",
 * et un rattachement CurriculumSubject vers la liste de matières du groupe.
 */
const CATALOGS = [
  {
    cycle: "SECONDARY",
    languageSystem: "FRANCOPHONE",
    levels: [
      { code: "6EME", label: "6ème" },
      { code: "5EME", label: "5ème" },
      { code: "4EME", label: "4ème" },
      { code: "3EME", label: "3ème" },
      { code: "2NDE", label: "2nde" },
      { code: "1ERE", label: "1ère" },
      { code: "TLE", label: "Terminale" },
    ],
    subjects: [
      { code: "FR", name: "Français" },
      { code: "MATH", name: "Mathématiques" },
      { code: "ANG", name: "Anglais" },
      { code: "HIST", name: "Histoire" },
      { code: "GEO", name: "Géographie" },
      { code: "SVT", name: "SVT" },
      { code: "PHYS", name: "Physique" },
      { code: "CHIM", name: "Chimie" },
      { code: "TECH", name: "Technologie" },
      { code: "EC", name: "Éducation civique" },
      { code: "EPS", name: "EPS" },
      { code: "ART", name: "Arts plastiques" },
      { code: "MUS", name: "Musique" },
    ],
  },
  {
    cycle: "PRIMARY",
    languageSystem: "FRANCOPHONE",
    levels: [
      { code: "SIL", label: "SIL" },
      { code: "CI", label: "CI" },
      { code: "CP", label: "CP" },
      { code: "CE1", label: "CE1" },
      { code: "CE2", label: "CE2" },
      { code: "CM1", label: "CM1" },
      { code: "CM2", label: "CM2" },
    ],
    subjects: [
      { code: "FR", name: "Français" },
      { code: "MATH", name: "Mathématiques" },
      { code: "EVS", name: "Éveil scientifique" },
      { code: "EC", name: "Éducation civique" },
      { code: "EPS", name: "EPS" },
      { code: "ART", name: "Arts plastiques" },
      { code: "MUS", name: "Musique" },
      { code: "ANG", name: "Anglais" },
    ],
  },
  {
    cycle: "SECONDARY",
    languageSystem: "ANGLOPHONE",
    levels: [
      { code: "FORM1", label: "Form 1" },
      { code: "FORM2", label: "Form 2" },
      { code: "FORM3", label: "Form 3" },
      { code: "FORM4", label: "Form 4" },
      { code: "FORM5", label: "Form 5" },
      { code: "LSIX", label: "Lower Sixth" },
      { code: "USIX", label: "Upper Sixth" },
    ],
    subjects: [
      { code: "ENG_LANG", name: "English Language" },
      { code: "MATHS_EN", name: "Mathematics" },
      { code: "PHYS_EN", name: "Physics" },
      { code: "CHEM_EN", name: "Chemistry" },
      { code: "BIO_EN", name: "Biology" },
      { code: "GEO_EN", name: "Geography" },
      { code: "HIST_EN", name: "History" },
      { code: "FR_EN", name: "French" },
      { code: "PE_EN", name: "Physical Education" },
      { code: "ART_EN", name: "Fine Art" },
      { code: "MUS_EN", name: "Music" },
      { code: "CE_EN", name: "Civic Education" },
    ],
  },
  {
    cycle: "PRIMARY",
    languageSystem: "ANGLOPHONE",
    levels: [
      { code: "CLASS1", label: "Class 1" },
      { code: "CLASS2", label: "Class 2" },
      { code: "CLASS3", label: "Class 3" },
      { code: "CLASS4", label: "Class 4" },
      { code: "CLASS5", label: "Class 5" },
      { code: "CLASS6", label: "Class 6" },
    ],
    subjects: [
      { code: "ENG_LANG_PRI", name: "English Language" },
      { code: "MATHS_PRI", name: "Mathematics" },
      { code: "SCI_PRI", name: "Science" },
      { code: "SOC_PRI", name: "Social Studies" },
      { code: "PE_PRI", name: "Physical Education" },
      { code: "ART_PRI", name: "Fine Art" },
      { code: "MUS_PRI", name: "Music" },
      { code: "FR_PRI", name: "French" },
    ],
  },
];

async function upsertSubject(code, name) {
  const existing = await prisma.subject.findFirst({
    where: { schoolId: null, name },
    select: { id: true },
  });
  if (existing) {
    return existing;
  }
  return prisma.subject.create({
    data: { schoolId: null, code, name },
  });
}

async function ensureLevel(cycle, languageSystem, code, label) {
  const existing = await prisma.academicLevel.findFirst({
    where: { schoolId: null, code },
    select: { id: true, cycle: true, languageSystem: true },
  });
  if (existing) {
    if (!existing.cycle || !existing.languageSystem) {
      await prisma.academicLevel.update({
        where: { id: existing.id },
        data: { cycle, languageSystem },
      });
    }
    return existing.id;
  }
  const created = await prisma.academicLevel.create({
    data: { schoolId: null, code, label, cycle, languageSystem },
  });
  return created.id;
}

async function ensureNationalCurriculum(academicLevelId, levelCode) {
  const existing = await prisma.curriculum.findFirst({
    where: { schoolId: null, academicLevelId },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }
  const created = await prisma.curriculum.create({
    data: {
      schoolId: null,
      academicLevelId,
      name: `${levelCode} - TRONC_COMMUN`,
    },
  });
  return created.id;
}

async function ensureCurriculumSubject(curriculumId, subjectId) {
  const existing = await prisma.curriculumSubject.findFirst({
    where: { schoolId: null, curriculumId, subjectId },
    select: { id: true },
  });
  if (existing) {
    return false;
  }
  await prisma.curriculumSubject.create({
    data: {
      schoolId: null,
      curriculumId,
      subjectId,
      isMandatory: true,
    },
  });
  return true;
}

async function main() {
  const summary = {
    levelsCreated: 0,
    subjectsCreated: 0,
    curriculumsCreated: 0,
    curriculumSubjectsCreated: 0,
  };

  for (const catalog of CATALOGS) {
    const subjectIds = [];
    for (const subject of catalog.subjects) {
      const before = await prisma.subject.count({
        where: { schoolId: null, name: subject.name },
      });
      const record = await upsertSubject(subject.code, subject.name);
      subjectIds.push(record.id);
      if (before === 0) {
        summary.subjectsCreated += 1;
      }
    }

    for (const level of catalog.levels) {
      const levelBefore = await prisma.academicLevel.count({
        where: { schoolId: null, code: level.code },
      });
      const academicLevelId = await ensureLevel(
        catalog.cycle,
        catalog.languageSystem,
        level.code,
        level.label,
      );
      if (levelBefore === 0) {
        summary.levelsCreated += 1;
      }

      const curriculumBefore = await prisma.curriculum.count({
        where: { schoolId: null, academicLevelId },
      });
      const curriculumId = await ensureNationalCurriculum(
        academicLevelId,
        level.code,
      );
      if (curriculumBefore === 0) {
        summary.curriculumsCreated += 1;
      }

      for (const subjectId of subjectIds) {
        const created = await ensureCurriculumSubject(curriculumId, subjectId);
        if (created) {
          summary.curriculumSubjectsCreated += 1;
        }
      }
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
