import { PrismaClient, TermReportStatus } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

for (const candidate of [
  path.resolve(__dirname, "../../../docker/.env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
]) {
  dotenv.config({ path: candidate, override: false });
}

const prisma = new PrismaClient();

const STUDENT_ID = "cmsx3mavq00016mpr6ojypis0"; // Elina MBELE
const CLASS_NAME = "6eB";

// ── Reproduction fidele de src/common/sequence.util.ts ──────────────────────
const TERM_TO_SEQUENCES = {
  TERM_1: ["SEQ_1", "SEQ_2"],
  TERM_2: ["SEQ_3", "SEQ_4"],
  TERM_3: ["SEQ_5", "SEQ_6"],
};
function isFirstSequenceOfTerm(sequence) {
  return sequence === "SEQ_1" || sequence === "SEQ_3" || sequence === "SEQ_5";
}
function evaluationCountsForAverage(sequence, isFinalExam) {
  if (isFirstSequenceOfTerm(sequence)) return true;
  return isFinalExam;
}
// Reproduction fidele de EvaluationsService.computeSequenceAverage
function computeSequenceAverage(studentId, evaluations) {
  let weightedSum = 0;
  let totalCoeff = 0;
  for (const evaluation of evaluations) {
    if (
      !evaluationCountsForAverage(evaluation.sequence, evaluation.isFinalExam)
    ) {
      continue;
    }
    const score = evaluation.scores.find((s) => s.studentId === studentId);
    if (!score || score.status !== "ENTERED" || score.score === null) {
      continue;
    }
    const normalized = (score.score / evaluation.maxScore) * 20;
    weightedSum += normalized * evaluation.coefficient;
    totalCoeff += evaluation.coefficient;
  }
  return totalCoeff > 0 ? Number((weightedSum / totalCoeff).toFixed(2)) : null;
}

const GENERAL_APPRECIATION = {
  TERM_1:
    "Trimestre d'integration correct. Elina prend ses reperes dans la classe, doit gagner en regularite.",
  TERM_2:
    "Bonne progression ce trimestre, participation active a l'oral en anglais.",
  TERM_3:
    "Bon eleve, resultats en nette progression sur l'annee. Conseil favorable a la poursuite.",
};

const SUBJECT_APPRECIATION_TEMPLATES = [
  "Ensemble satisfaisant, continuer les efforts.",
  "Bonne participation en classe, travail regulier.",
  "Resultats encourageants, quelques lacunes a combler.",
  "Bon niveau general, eleve serieux et applique.",
  "Progression notable depuis le debut du trimestre.",
];

async function main() {
  const student = await prisma.student.findUnique({
    where: { id: STUDENT_ID },
    select: { id: true, schoolId: true, firstName: true, lastName: true },
  });
  if (!student) {
    throw new Error(`Eleve ${STUDENT_ID} introuvable`);
  }
  const { schoolId } = student;

  const classroom = await prisma.class.findFirst({
    where: { schoolId, name: CLASS_NAME },
    select: { id: true, schoolYearId: true },
  });
  if (!classroom) {
    throw new Error(`Classe ${CLASS_NAME} introuvable`);
  }
  const { id: classId, schoolYearId } = classroom;

  const summary = [];

  for (const term of ["TERM_1", "TERM_2", "TERM_3"]) {
    const [seq1, seq2] = TERM_TO_SEQUENCES[term];

    const evaluations = await prisma.evaluation.findMany({
      where: {
        schoolId,
        classId,
        schoolYearId,
        status: "PUBLISHED",
        sequence: { in: [seq1, seq2] },
      },
      include: {
        scores: { where: { studentId: STUDENT_ID } },
      },
    });

    const subjectIds = [...new Set(evaluations.map((e) => e.subjectId))];
    if (subjectIds.length === 0) {
      summary.push({ term, subjects: 0, note: "aucune evaluation trouvee" });
      continue;
    }

    const subjectEntries = subjectIds.map((subjectId, index) => {
      const seq1Avg = computeSequenceAverage(
        STUDENT_ID,
        evaluations.filter(
          (e) => e.sequence === seq1 && e.subjectId === subjectId,
        ),
      );
      const seq2Avg = computeSequenceAverage(
        STUDENT_ID,
        evaluations.filter(
          (e) => e.sequence === seq2 && e.subjectId === subjectId,
        ),
      );
      const termAverage =
        seq1Avg !== null && seq2Avg !== null
          ? Number(((seq1Avg + seq2Avg) / 2).toFixed(2))
          : (seq1Avg ?? seq2Avg);

      return {
        schoolId,
        subjectId,
        appreciation:
          SUBJECT_APPRECIATION_TEMPLATES[
            index % SUBJECT_APPRECIATION_TEMPLATES.length
          ],
        seq1Average: seq1Avg,
        seq2Average: seq2Avg,
        termAverage,
        updatedByUserId: null, // renseigne juste apres via le premier admin trouve
      };
    });

    const admin = await prisma.schoolMembership.findFirst({
      where: { schoolId, role: "SCHOOL_ADMIN" },
      select: { userId: true },
    });
    if (!admin) {
      throw new Error(`Aucun SCHOOL_ADMIN trouve pour l'ecole ${schoolId}`);
    }
    const updatedByUserId = admin.userId;
    for (const entry of subjectEntries) {
      entry.updatedByUserId = updatedByUserId;
    }

    const existing = await prisma.studentTermReport.findUnique({
      where: {
        schoolYearId_classId_studentId_term: {
          schoolYearId,
          classId,
          studentId: STUDENT_ID,
          term,
        },
      },
      select: { id: true },
    });

    const report = await prisma.studentTermReport.upsert({
      where: {
        schoolYearId_classId_studentId_term: {
          schoolYearId,
          classId,
          studentId: STUDENT_ID,
          term,
        },
      },
      update: {
        status: TermReportStatus.PUBLISHED,
        generalAppreciation: GENERAL_APPRECIATION[term],
        updatedByUserId,
        publishedAt: new Date(),
        subjectEntries: {
          deleteMany: { subjectId: { in: subjectIds } },
          create: subjectEntries,
        },
      },
      create: {
        schoolId,
        schoolYearId,
        classId,
        studentId: STUDENT_ID,
        term,
        status: TermReportStatus.PUBLISHED,
        generalAppreciation: GENERAL_APPRECIATION[term],
        updatedByUserId,
        publishedAt: new Date(),
        subjectEntries: { create: subjectEntries },
      },
      select: { id: true },
    });

    summary.push({
      term,
      reportId: report.id,
      existed: Boolean(existing),
      subjects: subjectEntries.length,
      averages: subjectEntries.map((e) => ({
        subjectId: e.subjectId,
        termAverage: e.termAverage,
      })),
    });
  }

  console.log(JSON.stringify({ studentId: STUDENT_ID, summary }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
