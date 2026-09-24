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

const SCHOOL_SLUG = "lycee-du-poisson-d-avril";
const STUDENT_FIRST_NAME = "Romaric";
const STUDENT_LAST_NAME = "Pistone";
const PARENT_PHONE = "+237689068887";

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

  const parent = await prisma.user.findFirst({
    where: { phone: PARENT_PHONE },
    select: { id: true },
  });
  if (!parent) {
    throw new Error(`Parent with phone ${PARENT_PHONE} not found`);
  }

  const manager = await prisma.user.findFirst({
    where: {
      firstName: "Emma",
      lastName: "MBELE",
      memberships: { some: { schoolId: school.id, role: "SCHOOL_ADMIN" } },
    },
    select: { id: true },
  });
  if (!manager) {
    throw new Error(`School admin Emma MBELE not found at ${SCHOOL_SLUG}`);
  }

  const referentTeacher = await prisma.user.findFirst({
    where: {
      firstName: "Anne",
      lastName: "Rousselot",
      memberships: { some: { schoolId: school.id, role: "TEACHER" } },
    },
    select: { id: true },
  });
  if (!referentTeacher) {
    throw new Error(`Teacher Anne Rousselot not found at ${SCHOOL_SLUG}`);
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
      label: "Allergie aux fruits de mer",
      description:
        "Allergie alimentaire confirmée par allergologue en 2025 (crevettes, crabe). Réaction déjà observée : urticaire généralisée et gonflement des lèvres après ingestion accidentelle lors d'un repas de cantine.",
      emergencyInstructions:
        "Éviter tout aliment à base de fruits de mer ou préparé dans les mêmes ustensiles. En cas de réaction : administrer le stylo d'adrénaline (trousse d'urgence à l'infirmerie), appeler les secours et prévenir les parents immédiatement.",
      isVisibleToAllTeachers: true,
      publicAlertLabel: "Allergie alimentaire sévère — fruits de mer",
      active: true,
      startDate: new Date("2025-09-01T00:00:00.000Z"),
      endDate: null,
      createdByUserId: parent.id,
    },
    {
      type: "PATHOLOGY",
      alertLevel: "ATTENTION",
      label: "Asthme d'effort",
      description:
        "Asthme d'effort diagnostiqué en 2024, bien contrôlé sous traitement de fond. Peut nécessiter la ventoline en cas d'effort intense (EPS) ou de temps froid et sec.",
      emergencyInstructions:
        "La ventoline se trouve dans le sac de sport et à l'infirmerie. En cas de gêne respiratoire persistante malgré la ventoline, contacter l'infirmerie et les parents sans délai.",
      isVisibleToAllTeachers: true,
      publicAlertLabel: "Asthme — ventoline si besoin",
      active: true,
      startDate: new Date("2024-11-10T00:00:00.000Z"),
      endDate: null,
      createdByUserId: parent.id,
    },
    {
      type: "TREATMENT",
      alertLevel: "INFO",
      label: "Traitement de fond asthme (corticoïde inhalé)",
      description:
        "Prise quotidienne matin et soir d'un corticoïde inhalé (Flixotide) dans le cadre du suivi de l'asthme. Traitement pris à domicile, aucune prise nécessaire sur le temps scolaire.",
      emergencyInstructions: null,
      isVisibleToAllTeachers: false,
      publicAlertLabel: null,
      active: true,
      startDate: daysAgo(90),
      endDate: daysFromNow(180),
      createdByUserId: manager.id,
    },
    {
      type: "INSTRUCTION",
      alertLevel: "INFO",
      label: "Dispense partielle de sport intense les jours de forte chaleur",
      description:
        "En raison de son asthme d'effort, éviter les efforts intenses en extérieur lorsque la température dépasse 32°C. Privilégier une activité adaptée avec l'enseignant d'EPS, échauffement plus progressif.",
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
      label: "Port de lunettes (myopie légère)",
      description:
        "Myopie légère diagnostiquée par l'ophtalmologiste, correction prescrite pour la lecture au tableau et la lecture prolongée. Lunettes portées en classe depuis octobre 2025.",
      emergencyInstructions: null,
      isVisibleToAllTeachers: false,
      publicAlertLabel: null,
      active: true,
      startDate: new Date("2025-10-05T00:00:00.000Z"),
      endDate: null,
      createdByUserId: parent.id,
    },
    {
      type: "OTHER",
      alertLevel: "INFO",
      label: "Fracture du poignet droit (consolidée)",
      description:
        "Fracture du poignet droit suite à une chute de trottinette pendant les vacances. Immobilisation 5 semaines, rééducation terminée. Aucune restriction actuelle.",
      emergencyInstructions: null,
      isVisibleToAllTeachers: false,
      publicAlertLabel: null,
      active: false,
      startDate: new Date("2025-12-20T00:00:00.000Z"),
      endDate: new Date("2026-01-28T00:00:00.000Z"),
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
      occurredAt: daysAgo(45, 12, 20),
      summary: "Passage à l'infirmerie — maux de tête",
      description:
        "Romaric s'est présenté à l'infirmerie en fin de matinée se plaignant de maux de tête. Repos 20 minutes, prise de tension normale. Retour en cours après amélioration.",
      alertLevel: "INFO",
      followUpNeeded: false,
      authorUserId: manager.id,
    },
    {
      occurredAt: daysAgo(28, 10, 40),
      summary: "Gêne respiratoire pendant le cross du collège",
      description:
        "Légère crise d'asthme pendant le cross annuel. Ventoline administrée (2 bouffées), amélioration en quelques minutes. Élève mis au repos, a pu terminer la course en marchant. Parents informés le soir même.",
      alertLevel: "ATTENTION",
      followUpNeeded: true,
      authorUserId: manager.id,
    },
    {
      occurredAt: daysAgo(14, 9, 5),
      summary: "Chute dans les escaliers",
      description:
        "Chute dans l'escalier entre deux cours, contusion au coude gauche sans plaie. Poche de froid appliquée 15 minutes à l'infirmerie, mobilité normale vérifiée. Aucun signe de gravité.",
      alertLevel: "ATTENTION",
      followUpNeeded: false,
      authorUserId: manager.id,
    },
    {
      occurredAt: daysAgo(6, 12, 30),
      summary: "Réaction cutanée après le repas de cantine",
      description:
        "Rougeurs et démangeaisons autour de la bouche après le déjeuner, sans gêne respiratoire ni gonflement du visage. Antihistaminique administré sur protocole, surveillance 1h à l'infirmerie, disparition progressive. Menu vérifié avec la cantine pour tracer une éventuelle trace de fruits de mer.",
      alertLevel: "URGENT",
      followUpNeeded: true,
      authorUserId: manager.id,
    },
    {
      occurredAt: daysAgo(1, 8, 45),
      summary: "Contrôle de routine de la ventoline",
      description:
        "Vérification de la trousse d'urgence de Romaric à l'infirmerie : ventoline à jour, date de péremption vérifiée (valide jusqu'en 2027). Trousse complète.",
      alertLevel: "INFO",
      followUpNeeded: false,
      authorUserId: referentTeacher.id,
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
        "Romaric a eu une grippe saisonnière avec fièvre à 38.9°C. Il est resté à la maison sous traitement (paracétamol, repos, hydratation). Peut reprendre les cours normalement à partir de demain.",
      sportRestriction: true,
      effectiveFrom: daysAgo(40),
      effectiveTo: daysAgo(35),
      reportedByUserId: parent.id,
      acknowledgedByUserId: referentTeacher.id,
      acknowledgedAt: daysAgo(34, 8, 15),
    },
    {
      type: "VACCINATION",
      alertLevel: "INFO",
      description:
        "Rappel du vaccin DTP (diphtérie-tétanos-poliomyélite) effectué chez le médecin traitant. Carnet de santé mis à jour, aucun effet secondaire constaté.",
      sportRestriction: false,
      effectiveFrom: daysAgo(10),
      effectiveTo: null,
      reportedByUserId: parent.id,
      acknowledgedByUserId: null,
      acknowledgedAt: null,
    },
    {
      type: "RESTRICTION_SPORT",
      alertLevel: "ATTENTION",
      description:
        "Entorse légère de la cheville gauche pendant le week-end (chute en jouant au football). Le médecin recommande d'éviter le sport pendant 2 semaines, marche normale autorisée.",
      sportRestriction: true,
      effectiveFrom: daysAgo(2),
      effectiveTo: daysFromNow(12),
      reportedByUserId: parent.id,
      acknowledgedByUserId: manager.id,
      acknowledgedAt: daysAgo(2, 17, 30),
    },
    {
      type: "CONSULTATION",
      alertLevel: "INFO",
      description:
        "Consultation de suivi chez le pneumologue pour l'asthme : évolution favorable, traitement de fond maintenu à l'identique. Prochain contrôle prévu dans 6 mois.",
      sportRestriction: false,
      effectiveFrom: daysAgo(5),
      effectiveTo: null,
      reportedByUserId: parent.id,
      acknowledgedByUserId: referentTeacher.id,
      acknowledgedAt: daysAgo(4, 9, 0),
    },
    {
      type: "ACCIDENT",
      alertLevel: "ATTENTION",
      description:
        "Chute de vélo à domicile le week-end, contusion à la hanche droite. Radiographie faite par précaution, aucune fracture. Douleur résiduelle à la marche rapide et à la course.",
      sportRestriction: true,
      effectiveFrom: daysAgo(3),
      effectiveTo: daysFromNow(4),
      reportedByUserId: parent.id,
      acknowledgedByUserId: manager.id,
      acknowledgedAt: daysAgo(3, 18, 0),
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
