/**
 * Seed : curriculum (niveaux/matières) + ressources (devoirs et examens) pour
 * les écoles Mfoundi ajoutées par seed-mfoundi-schools.mjs.
 *
 * Prérequis : node prisma/scripts/seed-mfoundi-schools.mjs (crée les écoles)
 * et node prisma/scripts/seed-resources-catalog.mjs (catalogue national
 * AcademicLevel/Subject, schoolId=null) doivent avoir été exécutés avant.
 *
 * Pour chaque école :
 * - un Curriculum "Tronc commun" par niveau (6ème et 3ème), avec quelques
 *   matières nationales rattachées (CurriculumSubject) ;
 * - deux Resource de type ASSESSMENT (devoir de séquence), rattachées à
 *   l'école (schoolId) ;
 * Un petit lot de Resource de type EXAM (épreuves blanches) est aussi créé au
 * niveau national (schoolId=null, comme l'exige le modèle) une seule fois,
 * pas par école.
 *
 * Usage : node prisma/scripts/seed-mfoundi-resources.mjs
 */
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MFOUNDI_SCHOOLS, withUniqueSlugs } from "./mfoundi-schools.data.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
for (const candidate of [
  path.resolve(__dirname, "../../../docker/.env"),
  path.resolve(__dirname, "../../.env"),
]) {
  dotenv.config({ path: candidate, override: false });
}

function currentAcademicYearLabel(now = new Date()) {
  const year = now.getFullYear();
  return now.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}
const CURRENT_ACADEMIC_YEAR_LABEL = currentAcademicYearLabel();

const prisma = new PrismaClient();

const TEACHER_EMAIL = "plizaweb@gmail.com";

const CURRICULUM_LEVELS = [
  { code: "6EME", subjects: ["FR", "MATH", "ANG", "HIST", "SVT"] },
  { code: "3EME", subjects: ["FR", "MATH", "ANG", "PHYS", "CHIM"] },
];

const ASSESSMENT_TEMPLATES = [
  {
    levelCode: "6EME",
    subjectCode: "MATH",
    sequence: "SEQ_1",
    examType: "SEQUENCE_TEST",
    title: "Devoir de séquence 1 — Nombres entiers",
    statementContent:
      "<p>Exercices sur les opérations et la comparaison des nombres entiers.</p>",
  },
  {
    levelCode: "3EME",
    subjectCode: "PHYS",
    sequence: "SEQ_2",
    examType: "POP_QUIZ",
    title: "Interrogation surprise — Circuits électriques",
    statementContent:
      "<p>Questions courtes sur le circuit électrique simple et les lois de base.</p>",
  },
];

const NATIONAL_EXAM_TEMPLATES = [
  {
    levelCode: "3EME",
    subjectCode: "MATH",
    examType: "MOCK_EXAM",
    title: "Examen blanc BEPC — Mathématiques",
    statementContent:
      "<p>Sujet blanc type BEPC couvrant le programme de mathématiques de 3ème.</p>",
  },
  {
    levelCode: "TLE",
    subjectCode: "PHYS",
    examType: "MOCK_EXAM",
    title: "Examen blanc Baccalauréat — Physique",
    statementContent:
      "<p>Sujet blanc type Baccalauréat couvrant le programme de physique de Terminale.</p>",
  },
];

async function loadNationalCatalog() {
  const [levels, subjects] = await Promise.all([
    prisma.academicLevel.findMany({ where: { schoolId: null } }),
    prisma.subject.findMany({ where: { schoolId: null } }),
  ]);

  return {
    levelByCode: new Map(levels.map((l) => [l.code, l])),
    subjectByCode: new Map(subjects.map((s) => [s.code, s])),
  };
}

async function ensureCurriculum(
  school,
  levelCode,
  levelId,
  subjectCodes,
  subjectByCode,
) {
  const name = `Tronc commun ${levelCode}`;
  const curriculum = await prisma.curriculum.upsert({
    where: { schoolId_name: { schoolId: school.id, name } },
    create: {
      schoolId: school.id,
      name,
      academicLevelId: levelId,
    },
    update: {},
  });

  for (const code of subjectCodes) {
    const subject = subjectByCode.get(code);
    if (!subject) continue;
    await prisma.curriculumSubject.upsert({
      where: {
        curriculumId_subjectId: {
          curriculumId: curriculum.id,
          subjectId: subject.id,
        },
      },
      create: {
        schoolId: school.id,
        curriculumId: curriculum.id,
        subjectId: subject.id,
        isMandatory: true,
        coefficient: 1,
        weeklyHours: 4,
      },
      update: {},
    });
  }

  return curriculum;
}

async function ensureAssessment(
  school,
  authorUserId,
  template,
  levelByCode,
  subjectByCode,
) {
  const level = levelByCode.get(template.levelCode);
  const subject = subjectByCode.get(template.subjectCode);
  if (!level || !subject) return null;

  const existing = await prisma.resource.findFirst({
    where: {
      schoolId: school.id,
      academicLevelId: level.id,
      subjectId: subject.id,
      title: template.title,
    },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.resource.create({
    data: {
      kind: "ASSESSMENT",
      schoolId: school.id,
      academicLevelId: level.id,
      subjectId: subject.id,
      examType: template.examType,
      sequence: template.sequence,
      academicYearLabel: CURRENT_ACADEMIC_YEAR_LABEL,
      title: template.title,
      authorUserId,
      statementContent: template.statementContent,
      statementStatus: "APPROVED",
      statementApprovedByUserId: authorUserId,
      statementApprovedAt: new Date(),
    },
  });
}

async function ensureNationalExam(
  authorUserId,
  template,
  levelByCode,
  subjectByCode,
) {
  const level = levelByCode.get(template.levelCode);
  const subject = subjectByCode.get(template.subjectCode);
  if (!level || !subject) return null;

  const existing = await prisma.resource.findFirst({
    where: {
      schoolId: null,
      academicLevelId: level.id,
      subjectId: subject.id,
      title: template.title,
    },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.resource.create({
    data: {
      kind: "EXAM",
      schoolId: null,
      academicLevelId: level.id,
      subjectId: subject.id,
      examType: template.examType,
      sequence: null,
      academicYearLabel: CURRENT_ACADEMIC_YEAR_LABEL,
      title: template.title,
      authorUserId,
      statementContent: template.statementContent,
      statementStatus: "APPROVED",
      statementApprovedByUserId: authorUserId,
      statementApprovedAt: new Date(),
    },
  });
}

async function main() {
  const teacher = await prisma.user.findUnique({
    where: { email: TEACHER_EMAIL },
    select: { id: true },
  });
  if (!teacher) {
    throw new Error(`Utilisateur introuvable pour ${TEACHER_EMAIL}`);
  }

  const { levelByCode, subjectByCode } = await loadNationalCatalog();

  const summary = { curriculums: 0, assessments: 0, nationalExams: 0 };

  for (const entry of withUniqueSlugs(MFOUNDI_SCHOOLS)) {
    const slug = entry.slug;

    const school = await prisma.school.findUnique({ where: { slug } });
    if (!school) {
      throw new Error(
        `École ${slug} introuvable — lancez d'abord seed-mfoundi-schools.mjs`,
      );
    }

    for (const level of CURRICULUM_LEVELS) {
      const levelRow = levelByCode.get(level.code);
      if (!levelRow) continue;
      await ensureCurriculum(
        school,
        level.code,
        levelRow.id,
        level.subjects,
        subjectByCode,
      );
      summary.curriculums += 1;
    }

    for (const template of ASSESSMENT_TEMPLATES) {
      const resource = await ensureAssessment(
        school,
        teacher.id,
        template,
        levelByCode,
        subjectByCode,
      );
      if (resource) summary.assessments += 1;
    }
  }

  for (const template of NATIONAL_EXAM_TEMPLATES) {
    const resource = await ensureNationalExam(
      teacher.id,
      template,
      levelByCode,
      subjectByCode,
    );
    if (resource) summary.nationalExams += 1;
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
