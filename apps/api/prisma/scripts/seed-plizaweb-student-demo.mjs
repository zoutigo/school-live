import { PrismaClient, StudentLifeEventType, Term } from "@prisma/client";
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

const STUDENT_EMAIL = "plizaweb@gmail.com";
const CLASS_NAME = "6eB";

const GRADE_TEMPLATE_BY_TERM = {
  [Term.TERM_1]: [
    { label: "Devoir 1", value: 13.5 },
    { label: "Interrogation", value: 11 },
    { label: "Composition", value: 14 },
  ],
  [Term.TERM_2]: [
    { label: "Devoir 1", value: 9.5 },
    { label: "Interrogation", value: 12 },
    { label: "Composition", value: 10.5 },
  ],
  [Term.TERM_3]: [
    { label: "Devoir 1", value: 15 },
    { label: "Interrogation", value: 16.5 },
    { label: "Composition", value: 14.5 },
  ],
};

const LIFE_EVENTS = [
  {
    type: StudentLifeEventType.ABSENCE,
    occurredAt: new Date("2025-10-13T07:30:00Z"),
    justified: true,
    reason: "Rendez-vous médical",
    comment: "Certificat médical transmis par la famille.",
  },
  {
    type: StudentLifeEventType.ABSENCE,
    occurredAt: new Date("2025-11-20T07:30:00Z"),
    durationMinutes: 300,
    justified: false,
    reason: "Absence non justifiée",
    comment: null,
  },
  {
    type: StudentLifeEventType.RETARD,
    occurredAt: new Date("2025-10-06T07:45:00Z"),
    durationMinutes: 15,
    justified: false,
    reason: "Retard au premier cours",
    comment: "Transport en commun.",
  },
  {
    type: StudentLifeEventType.RETARD,
    occurredAt: new Date("2026-01-12T07:40:00Z"),
    durationMinutes: 10,
    justified: true,
    reason: "Retard justifié par les parents",
    comment: null,
  },
  {
    type: StudentLifeEventType.PUNITION,
    occurredAt: new Date("2025-11-05T10:00:00Z"),
    reason: "Bavardage répété en cours",
    comment: "Devoir supplémentaire de grammaire à rendre.",
  },
  {
    type: StudentLifeEventType.SANCTION,
    occurredAt: new Date("2026-02-02T09:00:00Z"),
    reason: "Comportement perturbateur pendant l'évaluation",
    comment: "Convocation des parents, avertissement du conseil de discipline.",
  },
];

const MESSAGES = [
  {
    subject: "Absence non justifiée du 20 novembre",
    body: "Bonjour, nous vous informons que l'absence de Valery le 20 novembre n'a pas été justifiée à ce jour. Merci de nous transmettre un justificatif dans les meilleurs délais.",
    daysAgo: 60,
  },
  {
    subject: "Convocation - conseil de discipline",
    body: "Suite au comportement perturbateur signalé pendant l'évaluation, nous vous convoquons à un entretien avec le conseil de discipline. Merci de contacter le secrétariat pour fixer un rendez-vous.",
    daysAgo: 20,
  },
  {
    subject: "Résultats du 3e trimestre",
    body: "Les notes du 3e trimestre de Valery sont désormais disponibles dans l'espace élève. Une nette progression est à noter en Physique et en Anglais, félicitations.",
    daysAgo: 5,
  },
];

function daysAgoDate(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  const studentUser = await prisma.user.findUnique({
    where: { email: STUDENT_EMAIL },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      studentProfiles: {
        select: {
          id: true,
          schoolId: true,
          enrollments: {
            select: {
              schoolYearId: true,
              classId: true,
              status: true,
              class: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!studentUser) {
    throw new Error(`No user found for email ${STUDENT_EMAIL}`);
  }

  const studentProfile = studentUser.studentProfiles[0];
  if (!studentProfile) {
    throw new Error(`No student profile found for ${STUDENT_EMAIL}`);
  }

  const enrollment = studentProfile.enrollments.find(
    (item) => item.status === "ACTIVE" && item.class?.name === CLASS_NAME,
  );
  if (!enrollment) {
    throw new Error(
      `No active enrollment in ${CLASS_NAME} found for ${STUDENT_EMAIL}`,
    );
  }

  const { schoolId } = studentProfile;
  const { schoolYearId, classId } = enrollment;
  const studentId = studentProfile.id;

  const admin = await prisma.schoolMembership.findFirst({
    where: { schoolId, role: "SCHOOL_ADMIN", userId: { not: studentUser.id } },
    select: { user: { select: { id: true, email: true } } },
  });
  if (!admin) {
    throw new Error(`No school admin found for school ${schoolId}`);
  }
  const authorUserId = admin.user.id;

  const assignments = await prisma.teacherClassSubject.findMany({
    where: { schoolId, schoolYearId, classId },
    select: {
      teacherUserId: true,
      subjectId: true,
      subject: { select: { name: true } },
    },
  });
  if (assignments.length === 0) {
    throw new Error(
      `No teaching assignments found for class ${classId} / year ${schoolYearId}`,
    );
  }

  console.log(
    `Seeding for ${studentUser.firstName} ${studentUser.lastName} (${STUDENT_EMAIL}) — ${assignments.length} subjects`,
  );

  let gradesCreated = 0;
  for (const assignment of assignments) {
    for (const term of [Term.TERM_1, Term.TERM_2, Term.TERM_3]) {
      const gradeEntries = GRADE_TEMPLATE_BY_TERM[term];
      for (const entry of gradeEntries) {
        await prisma.studentGrade.create({
          data: {
            schoolId,
            schoolYearId,
            studentId,
            classId,
            subjectId: assignment.subjectId,
            teacherUserId: assignment.teacherUserId,
            value: entry.value,
            maxValue: 20,
            assessmentWeight: 1,
            term,
          },
        });
        gradesCreated += 1;
      }
    }
  }

  const lifeEventsCreated = [];
  for (const event of LIFE_EVENTS) {
    const created = await prisma.studentLifeEvent.create({
      data: {
        schoolId,
        studentId,
        classId,
        schoolYearId,
        authorUserId,
        type: event.type,
        occurredAt: event.occurredAt,
        durationMinutes: event.durationMinutes ?? null,
        justified: event.justified ?? null,
        reason: event.reason,
        comment: event.comment ?? null,
      },
    });
    lifeEventsCreated.push(created.id);
  }

  const messagesCreated = [];
  for (const message of MESSAGES) {
    const sentAt = daysAgoDate(message.daysAgo);
    const created = await prisma.internalMessage.create({
      data: {
        schoolId,
        senderUserId: authorUserId,
        status: "SENT",
        subject: message.subject,
        body: message.body,
        sentAt,
        createdAt: sentAt,
        recipients: {
          create: {
            schoolId,
            recipientUserId: studentUser.id,
          },
        },
      },
      select: { id: true },
    });
    messagesCreated.push(created.id);
  }

  console.log(
    JSON.stringify(
      {
        studentId,
        classId,
        schoolYearId,
        gradesCreated,
        lifeEventsCreated: lifeEventsCreated.length,
        messagesCreated: messagesCreated.length,
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
