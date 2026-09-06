/**
 * Seed local dédié à la vérification manuelle des correctifs du module
 * Santé (bugs remontés par le module Tests, VPS, école pilote) :
 *   - #298 : condition "visible de tous les enseignants" + libellé public requis
 *   - #300 : filtre Statut (Actives/Résolues) sur l'onglet Conditions
 *   - #314 / #322 : recherche + filtres sur l'onglet signalements (école entière)
 *   - #318 : acquittement d'un signalement en attente depuis la fiche élève
 *
 * Crée une école isolée (college-vogt-qa) avec ses propres comptes email/mot
 * de passe, sans toucher aux données réelles ni à college-vogt.
 *
 * Usage : node prisma/scripts/seed-sante-qa-local.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
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

const SCHOOL_SLUG = "college-vogt-qa";
const PASSWORD = "SanteQA-2026!";

function daysAgo(days, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function ensureUser({
  email,
  firstName,
  lastName,
  gender,
  activeRole,
  activeSchoolId,
}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      firstName,
      lastName,
      gender,
      passwordHash,
      mustChangePassword: false,
      profileCompleted: true,
      activationStatus: "ACTIVE",
      activeRole,
      activeSchoolId,
    },
    update: {
      passwordHash,
      activeRole,
      activeSchoolId,
      profileCompleted: true,
      activationStatus: "ACTIVE",
      mustChangePassword: false,
    },
  });
}

async function ensureMembership(userId, schoolId, role) {
  return prisma.schoolMembership.upsert({
    where: { userId_schoolId_role: { userId, schoolId, role } },
    create: { userId, schoolId, role },
    update: {},
  });
}

async function ensureStudent({ schoolId, firstName, lastName, dateOfBirth }) {
  const existing = await prisma.student.findFirst({
    where: { schoolId, firstName, lastName },
  });
  if (existing) return existing;
  return prisma.student.create({
    data: { schoolId, firstName, lastName, dateOfBirth },
  });
}

async function main() {
  const school = await prisma.school.upsert({
    where: { slug: SCHOOL_SLUG },
    create: {
      slug: SCHOOL_SLUG,
      name: "Collège Vogt QA Santé",
      country: "Cameroun",
      region: "Centre",
      city: "Yaoundé",
      schoolType: "GENERAL",
      ownership: "PRIVATE",
      foundedYear: 2020,
      languageSystem: "FRANCOPHONE",
      cycle: "SECONDARY",
    },
    update: {},
  });

  let activeSchoolYearId = school.activeSchoolYearId;
  if (!activeSchoolYearId) {
    const schoolYear = await prisma.schoolYear.upsert({
      where: {
        schoolId_label: { schoolId: school.id, label: "2025-2026" },
      },
      create: { schoolId: school.id, label: "2025-2026" },
      update: {},
    });
    await prisma.school.update({
      where: { id: school.id },
      data: { activeSchoolYearId: schoolYear.id },
    });
    activeSchoolYearId = schoolYear.id;
  }

  let klass = await prisma.class.findFirst({
    where: {
      schoolId: school.id,
      schoolYearId: activeSchoolYearId,
      classGroupId: null,
      name: "6e C",
    },
  });
  if (!klass) {
    klass = await prisma.class.create({
      data: {
        schoolId: school.id,
        schoolYearId: activeSchoolYearId,
        name: "6e C",
      },
    });
  }

  const parent = await ensureUser({
    email: "parent.wamba.sante-qa@scolive.test",
    firstName: "Paul",
    lastName: "Wamba",
    gender: "M",
    activeRole: "PARENT",
    activeSchoolId: school.id,
  });
  await ensureMembership(parent.id, school.id, "PARENT");

  const manager = await ensureUser({
    email: "manager.sante-qa@scolive.test",
    firstName: "Divine",
    lastName: "Talla",
    gender: "F",
    activeRole: "SCHOOL_MANAGER",
    activeSchoolId: school.id,
  });
  await ensureMembership(manager.id, school.id, "SCHOOL_MANAGER");

  const healthOfficer = await ensureUser({
    email: "health-officer.sante-qa@scolive.test",
    firstName: "Sandrine",
    lastName: "Ateba",
    gender: "F",
    activeRole: "SCHOOL_HEALTH_OFFICER",
    activeSchoolId: school.id,
  });
  await ensureMembership(healthOfficer.id, school.id, "SCHOOL_HEALTH_OFFICER");

  const referentTeacher = await ensureUser({
    email: "teacher.sante-qa@scolive.test",
    firstName: "Albert",
    lastName: "Mvondo",
    gender: "M",
    activeRole: "TEACHER",
    activeSchoolId: school.id,
  });
  await ensureMembership(referentTeacher.id, school.id, "TEACHER");
  await prisma.class.update({
    where: { id: klass.id },
    data: { referentTeacherUserId: referentTeacher.id },
  });

  const robert = await ensureStudent({
    schoolId: school.id,
    firstName: "Robert",
    lastName: "Wamba",
    dateOfBirth: new Date("2013-04-12T00:00:00.000Z"),
  });
  const nathan = await ensureStudent({
    schoolId: school.id,
    firstName: "Nathan",
    lastName: "Mbele",
    dateOfBirth: new Date("2013-09-03T00:00:00.000Z"),
  });

  await prisma.parentStudent.upsert({
    where: {
      parentUserId_studentId: { parentUserId: parent.id, studentId: robert.id },
    },
    create: { schoolId: school.id, parentUserId: parent.id, studentId: robert.id },
    update: {},
  });

  for (const student of [robert, nathan]) {
    await prisma.enrollment.upsert({
      where: {
        schoolYearId_studentId: {
          schoolYearId: activeSchoolYearId,
          studentId: student.id,
        },
      },
      create: {
        schoolId: school.id,
        schoolYearId: activeSchoolYearId,
        studentId: student.id,
        classId: klass.id,
        status: "ACTIVE",
      },
      update: { classId: klass.id },
    });
  }

  // ── Reset health data for a clean, reproducible scenario ──────────────
  for (const studentId of [robert.id, nathan.id]) {
    await prisma.studentHealthAttachment.deleteMany({
      where: { schoolId: school.id, condition: { studentId } },
    });
    await prisma.studentHealthAttachment.deleteMany({
      where: { schoolId: school.id, careEvent: { studentId } },
    });
    await prisma.studentHealthAttachment.deleteMany({
      where: { schoolId: school.id, report: { studentId } },
    });
    await prisma.studentHealthCondition.deleteMany({
      where: { schoolId: school.id, studentId },
    });
    await prisma.studentHealthCareEvent.deleteMany({
      where: { schoolId: school.id, studentId },
    });
    await prisma.studentHealthReport.deleteMany({
      where: { schoolId: school.id, studentId },
    });
  }

  // ── Conditions (précondition test #300 : une active, une résolue) ─────
  await prisma.studentHealthCondition.create({
    data: {
      schoolId: school.id,
      studentId: robert.id,
      type: "PATHOLOGY",
      alertLevel: "URGENT",
      label: "Asthme sévère",
      description: "Asthme sévère diagnostiqué, suivi pneumologue.",
      isVisibleToAllTeachers: false,
      active: true,
      startDate: daysAgo(200),
      createdByUserId: parent.id,
    },
  });
  await prisma.studentHealthCondition.create({
    data: {
      schoolId: school.id,
      studentId: robert.id,
      type: "ALLERGY",
      alertLevel: "ATTENTION",
      label: "Allergie aux arachides",
      description: "Allergie résolue après désensibilisation.",
      isVisibleToAllTeachers: false,
      active: false,
      startDate: daysAgo(400),
      endDate: daysAgo(30),
      createdByUserId: parent.id,
    },
  });

  // ── Signalements (précondition test #318 : un en attente ; #314/#322 :
  //    variété de types/statuts/niveaux pour exercer les filtres école) ──
  await prisma.studentHealthReport.create({
    data: {
      schoolId: school.id,
      studentId: robert.id,
      reportedByUserId: parent.id,
      type: "MALADIE",
      alertLevel: "ATTENTION",
      description: "Fièvre le week-end, resté à la maison lundi.",
      sportRestriction: false,
      effectiveFrom: daysAgo(2),
      acknowledgedByUserId: null,
      acknowledgedAt: null,
    },
  });
  await prisma.studentHealthReport.create({
    data: {
      schoolId: school.id,
      studentId: robert.id,
      reportedByUserId: parent.id,
      type: "VACCINATION",
      alertLevel: "INFO",
      description: "Rappel vaccinal effectué chez le médecin traitant.",
      sportRestriction: false,
      effectiveFrom: daysAgo(15),
      acknowledgedByUserId: referentTeacher.id,
      acknowledgedAt: daysAgo(14, 8, 0),
    },
  });
  await prisma.studentHealthReport.create({
    data: {
      schoolId: school.id,
      studentId: nathan.id,
      reportedByUserId: parent.id,
      type: "ACCIDENT",
      alertLevel: "URGENT",
      description: "Chute à vélo hors école, bras en écharpe.",
      sportRestriction: true,
      effectiveFrom: daysAgo(3),
      acknowledgedByUserId: null,
      acknowledgedAt: null,
    },
  });
  await prisma.studentHealthReport.create({
    data: {
      schoolId: school.id,
      studentId: nathan.id,
      reportedByUserId: parent.id,
      type: "CONSULTATION",
      alertLevel: "INFO",
      description: "Contrôle ORL de routine.",
      sportRestriction: false,
      effectiveFrom: daysAgo(6),
      acknowledgedByUserId: manager.id,
      acknowledgedAt: daysAgo(5, 10, 0),
    },
  });

  // ── Un événement de soins pour vérifier le maintien du merge Historique ─
  await prisma.studentHealthCareEvent.create({
    data: {
      schoolId: school.id,
      studentId: robert.id,
      authorUserId: manager.id,
      occurredAt: daysAgo(4, 11, 0),
      summary: "Chute dans la cour",
      description: "Genou éraflé, pansement posé.",
      alertLevel: "ATTENTION",
      followUpNeeded: false,
    },
  });

  console.log(
    JSON.stringify(
      {
        school: { slug: school.slug, id: school.id },
        password: PASSWORD,
        accounts: {
          parent: parent.email,
          schoolManager: manager.email,
          healthOfficer: healthOfficer.email,
          teacher: referentTeacher.email,
        },
        students: {
          robertWamba: robert.id,
          nathanMbele: nathan.id,
        },
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
