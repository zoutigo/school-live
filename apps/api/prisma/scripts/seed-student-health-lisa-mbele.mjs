import { PrismaClient } from "@prisma/client";
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

const SCHOOL_SLUG = "college-vogt";
const STUDENT_FIRST_NAME = "Lisa";
const STUDENT_LAST_NAME = "MBELE";
const PARENT_EMAIL = "plizaweb@gmail.com";

function daysAgo(days, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysFromNow(days, hour = 9, minute = 0) {
  return daysAgo(-days, hour, minute);
}

async function main() {
  const school = await prisma.school.findUnique({
    where: { slug: SCHOOL_SLUG },
    select: { id: true },
  });
  if (!school) {
    throw new Error(`School ${SCHOOL_SLUG} not found`);
  }

  const student = await prisma.student.findFirst({
    where: {
      schoolId: school.id,
      firstName: STUDENT_FIRST_NAME,
      lastName: STUDENT_LAST_NAME,
    },
    select: { id: true },
  });
  if (!student) {
    throw new Error(
      `Student ${STUDENT_FIRST_NAME} ${STUDENT_LAST_NAME} not found at ${SCHOOL_SLUG}`,
    );
  }

  const parent = await prisma.user.findUnique({
    where: { email: PARENT_EMAIL },
    select: { id: true },
  });
  if (!parent) {
    throw new Error(`Parent ${PARENT_EMAIL} not found`);
  }

  const manager = await prisma.user.findFirst({
    where: {
      firstName: "Anne",
      lastName: "Rousselot",
      memberships: { some: { schoolId: school.id, role: "SCHOOL_ADMIN" } },
    },
    select: { id: true },
  });
  if (!manager) {
    throw new Error("School admin Anne Rousselot not found at college-vogt");
  }

  const referentTeacher = await prisma.user.findFirst({
    where: {
      firstName: "Albert",
      lastName: "Mvondo",
      memberships: { some: { schoolId: school.id, role: "TEACHER" } },
    },
    select: { id: true },
  });
  if (!referentTeacher) {
    throw new Error("Referent teacher Albert Mvondo not found at college-vogt");
  }

  await prisma.studentHealthAttachment.deleteMany({
    where: { schoolId: school.id, condition: { studentId: student.id } },
  });
  await prisma.studentHealthAttachment.deleteMany({
    where: { schoolId: school.id, careEvent: { studentId: student.id } },
  });
  await prisma.studentHealthAttachment.deleteMany({
    where: { schoolId: school.id, report: { studentId: student.id } },
  });
  await prisma.studentHealthAccessLog.deleteMany({
    where: { schoolId: school.id, studentId: student.id },
  });
  await prisma.studentHealthCondition.deleteMany({
    where: { schoolId: school.id, studentId: student.id },
  });
  await prisma.studentHealthCareEvent.deleteMany({
    where: { schoolId: school.id, studentId: student.id },
  });
  await prisma.studentHealthReport.deleteMany({
    where: { schoolId: school.id, studentId: student.id },
  });

  const conditions = [
    {
      type: "ALLERGY",
      alertLevel: "URGENT",
      label: "Allergie aux arachides",
      description:
        "Allergie alimentaire sévère confirmée par allergologue en 2024. Réaction déjà observée après ingestion accidentelle (urticaire, gonflement des lèvres).",
      emergencyInstructions:
        "Éviter tout aliment contenant des arachides ou traces d'arachides. En cas de réaction : administrer le stylo d'adrénaline (trousse d'urgence à l'infirmerie), appeler les secours (15) et prévenir les parents immédiatement.",
      isVisibleToAllTeachers: true,
      publicAlertLabel: "Allergie alimentaire sévère",
      active: true,
      startDate: new Date("2024-09-02T00:00:00.000Z"),
      endDate: null,
      createdByUserId: parent.id,
    },
    {
      type: "PATHOLOGY",
      alertLevel: "ATTENTION",
      label: "Asthme léger",
      description:
        "Asthme d'effort diagnostiqué en 2023, bien contrôlé. Peut nécessiter la ventoline en cas d'effort intense (EPS) ou de temps froid et sec.",
      emergencyInstructions:
        "La ventoline est dans son sac de sport. En cas de gêne respiratoire persistante malgré la ventoline, contacter l'infirmerie et les parents.",
      isVisibleToAllTeachers: true,
      publicAlertLabel: "Asthme — ventoline si besoin",
      active: true,
      startDate: new Date("2023-10-15T00:00:00.000Z"),
      endDate: null,
      createdByUserId: parent.id,
    },
    {
      type: "TREATMENT",
      alertLevel: "INFO",
      label: "Traitement antihistaminique saisonnier",
      description:
        "Prise quotidienne d'un antihistaminique (Aerius) pendant la saison des pollens pour rhinite allergique.",
      emergencyInstructions: null,
      isVisibleToAllTeachers: false,
      publicAlertLabel: null,
      active: true,
      startDate: daysAgo(20),
      endDate: daysFromNow(70),
      createdByUserId: manager.id,
    },
    {
      type: "INSTRUCTION",
      alertLevel: "INFO",
      label: "Dispense de sport intense les jours de forte chaleur",
      description:
        "En raison de son asthme, éviter les efforts intenses en extérieur lorsque la température dépasse 32°C. Privilégier une activité adaptée avec l'enseignant d'EPS.",
      emergencyInstructions: null,
      isVisibleToAllTeachers: false,
      publicAlertLabel: null,
      active: true,
      startDate: daysAgo(60),
      endDate: null,
      createdByUserId: manager.id,
    },
    {
      type: "OTHER",
      alertLevel: "INFO",
      label: "Fracture du poignet gauche (consolidée)",
      description:
        "Fracture du poignet gauche suite à une chute de vélo. Immobilisation 6 semaines, rééducation terminée. Aucune restriction actuelle.",
      emergencyInstructions: null,
      isVisibleToAllTeachers: false,
      publicAlertLabel: null,
      active: false,
      startDate: new Date("2025-11-03T00:00:00.000Z"),
      endDate: new Date("2025-12-20T00:00:00.000Z"),
      createdByUserId: parent.id,
    },
  ];

  for (const data of conditions) {
    await prisma.studentHealthCondition.create({
      data: {
        schoolId: school.id,
        studentId: student.id,
        ...data,
      },
    });
  }

  const careEvents = [
    {
      occurredAt: daysAgo(21, 10, 15),
      summary: "Passage à l'infirmerie — douleur abdominale",
      description:
        "Lisa s'est présentée à l'infirmerie après le déjeuner en se plaignant de maux de ventre. Repos 20 minutes, prise de température normale (36.8°C). Retour en cours après amélioration.",
      alertLevel: "INFO",
      followUpNeeded: false,
      authorUserId: manager.id,
    },
    {
      occurredAt: daysAgo(10, 14, 30),
      summary: "Gêne respiratoire pendant le cours d'EPS",
      description:
        "Légère crise d'asthme pendant une séance de course d'endurance. Ventoline administrée (2 bouffées), amélioration en 5 minutes. Élève mise au repos pour le reste de la séance. Parents informés par téléphone.",
      alertLevel: "ATTENTION",
      followUpNeeded: true,
      authorUserId: manager.id,
    },
    {
      occurredAt: daysAgo(5, 10, 45),
      summary: "Chute dans la cour de récréation",
      description:
        "Chute en courant dans la cour, éraflure superficielle au genou droit. Nettoyage à l'eau et au savon, pansement posé. Aucun signe de gravité.",
      alertLevel: "ATTENTION",
      followUpNeeded: false,
      authorUserId: manager.id,
    },
    {
      occurredAt: daysAgo(2, 12, 5),
      summary: "Réaction cutanée après le repas de cantine",
      description:
        "Petites plaques rouges sur les avant-bras après le déjeuner, sans gêne respiratoire ni gonflement du visage. Antihistaminique donné sur protocole, surveillance 1h à l'infirmerie, disparition progressive. Menu du jour vérifié avec la cantine pour tracer une éventuelle trace d'arachide.",
      alertLevel: "URGENT",
      followUpNeeded: true,
      authorUserId: manager.id,
    },
  ];

  for (const data of careEvents) {
    await prisma.studentHealthCareEvent.create({
      data: {
        schoolId: school.id,
        studentId: student.id,
        ...data,
      },
    });
  }

  const reports = [
    {
      type: "MALADIE",
      alertLevel: "ATTENTION",
      description:
        "Lisa a eu une grippe saisonnière avec fièvre à 39°C. Elle est restée à la maison sous traitement (paracétamol, repos). Peut reprendre les cours normalement.",
      sportRestriction: true,
      effectiveFrom: daysAgo(35),
      effectiveTo: daysAgo(30),
      reportedByUserId: parent.id,
      acknowledgedByUserId: referentTeacher.id,
      acknowledgedAt: daysAgo(29, 8, 30),
    },
    {
      type: "VACCINATION",
      alertLevel: "INFO",
      description:
        "Rappel du vaccin antitétanique effectué chez le médecin traitant. Carnet de santé mis à jour, aucun effet secondaire constaté.",
      sportRestriction: false,
      effectiveFrom: daysAgo(7),
      effectiveTo: null,
      reportedByUserId: parent.id,
      acknowledgedByUserId: null,
      acknowledgedAt: null,
    },
    {
      type: "RESTRICTION_SPORT",
      alertLevel: "ATTENTION",
      description:
        "Entorse légère de la cheville droite pendant les vacances (chute). Le médecin recommande d'éviter le sport pendant 2 semaines, marche normale autorisée.",
      sportRestriction: true,
      effectiveFrom: daysAgo(1),
      effectiveTo: daysFromNow(13),
      reportedByUserId: parent.id,
      acknowledgedByUserId: manager.id,
      acknowledgedAt: daysAgo(1, 17, 0),
    },
    {
      type: "CONSULTATION",
      alertLevel: "INFO",
      description:
        "Consultation chez l'ophtalmologiste : légère myopie détectée, port de lunettes prescrit pour la lecture au tableau. Lunettes en cours de fabrication, port prévu sous 10 jours.",
      sportRestriction: false,
      effectiveFrom: daysAgo(4),
      effectiveTo: null,
      reportedByUserId: parent.id,
      acknowledgedByUserId: referentTeacher.id,
      acknowledgedAt: daysAgo(3, 9, 0),
    },
  ];

  for (const data of reports) {
    await prisma.studentHealthReport.create({
      data: {
        schoolId: school.id,
        studentId: student.id,
        ...data,
      },
    });
  }

  console.log(
    `Seeded health data for ${STUDENT_FIRST_NAME} ${STUDENT_LAST_NAME} (${student.id}): ${conditions.length} conditions, ${careEvents.length} care events, ${reports.length} reports.`,
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
