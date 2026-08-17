import { PrismaClient, EvaluationScoreStatus } from "@prisma/client";
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

const PARENT_EMAIL = "plizaweb@gmail.com";
const CLASS_NAME = "6eB";
const STUDENT_FIRST_NAME = "Elina";
const STUDENT_LAST_NAME = "MBELE";

// Score de base par sequence, avec une petite variation par matiere pour rester
// realiste (eleve regulier, autour de 12-15/20).
const SCORE_PLAN = {
  SEQ_2: 12.5,
  SEQ_3: 13,
  SEQ_4: 14,
  SEQ_5: 14.5,
  SEQ_6: 15.5,
};

function scoreFor(evaluation, index) {
  const base = SCORE_PLAN[evaluation.sequence] ?? 13;
  const variation = ((index % 5) - 2) * 0.5; // -1 .. +1
  const raw = base + variation;
  const capped = Math.max(6, Math.min(evaluation.maxScore, raw));
  return Math.round(capped * 2) / 2; // arrondi au demi-point
}

async function main() {
  const parentUser = await prisma.user.findUnique({
    where: { email: PARENT_EMAIL },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!parentUser) {
    throw new Error(`Aucun utilisateur trouve pour ${PARENT_EMAIL}`);
  }

  const parentMembership = await prisma.schoolMembership.findFirst({
    where: { userId: parentUser.id, role: "PARENT" },
    select: { schoolId: true },
  });
  if (!parentMembership) {
    throw new Error(
      `${PARENT_EMAIL} n'a pas de role PARENT dans une ecole : impossible de l'utiliser comme parent`,
    );
  }
  const schoolId = parentMembership.schoolId;

  const classroom = await prisma.class.findFirst({
    where: { schoolId, name: CLASS_NAME },
    select: { id: true, schoolYearId: true, academicLevelId: true },
  });
  if (!classroom) {
    throw new Error(`Classe ${CLASS_NAME} introuvable pour l'ecole ${schoolId}`);
  }

  const existingStudent = await prisma.student.findFirst({
    where: {
      schoolId,
      firstName: STUDENT_FIRST_NAME,
      lastName: STUDENT_LAST_NAME,
    },
    select: { id: true },
  });
  if (existingStudent) {
    throw new Error(
      `Un eleve ${STUDENT_FIRST_NAME} ${STUDENT_LAST_NAME} existe deja (id=${existingStudent.id}) dans cette ecole. Script non idempotent, arret.`,
    );
  }

  const student = await prisma.student.create({
    data: {
      schoolId,
      firstName: STUDENT_FIRST_NAME,
      lastName: STUDENT_LAST_NAME,
      dateOfBirth: new Date("2013-04-18T00:00:00Z"),
    },
  });

  await prisma.enrollment.create({
    data: {
      schoolId,
      schoolYearId: classroom.schoolYearId,
      studentId: student.id,
      classId: classroom.id,
      academicLevelId: classroom.academicLevelId,
      status: "ACTIVE",
      confirmedAt: new Date(),
      confirmationSource: "MANUAL",
    },
  });

  await prisma.parentStudent.create({
    data: {
      schoolId,
      parentUserId: parentUser.id,
      studentId: student.id,
    },
  });

  const evaluations = await prisma.evaluation.findMany({
    where: { schoolId, classId: classroom.id },
    select: {
      id: true,
      sequence: true,
      maxScore: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let scoresCreated = 0;
  for (const [index, evaluation] of evaluations.entries()) {
    await prisma.studentEvaluationScore.create({
      data: {
        evaluationId: evaluation.id,
        studentId: student.id,
        score: scoreFor(evaluation, index),
        status: EvaluationScoreStatus.ENTERED,
      },
    });
    scoresCreated += 1;
  }

  console.log(
    JSON.stringify(
      {
        parentUserId: parentUser.id,
        schoolId,
        classId: classroom.id,
        schoolYearId: classroom.schoolYearId,
        studentId: student.id,
        scoresCreated,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
