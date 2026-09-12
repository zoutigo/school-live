/**
 * Seed local dédié à la simulation manuelle du workflow complet de fin
 * d'année : bulletin rempli -> décision du conseil de classe -> notification
 * parent -> paiement de la tranche de réinscription -> liste de fournitures
 * -> pool des élèves à affecter dans une classe.
 *
 * Crée une école isolée (college-vogt-qa-promotion) avec ses propres comptes
 * email/mot de passe, sans toucher aux données réelles ni à college-vogt.
 *
 * Usage : node prisma/scripts/seed-promotion-workflow-qa-local.mjs
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

const SCHOOL_SLUG = "college-vogt-qa-promotion";
const PASSWORD = "PromoQA-2026!";

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
  const level6e = await prisma.academicLevel.findFirst({
    where: { label: "6ème", languageSystem: "FRANCOPHONE", schoolId: null },
    select: { id: true },
  });
  const level5e = await prisma.academicLevel.findFirst({
    where: { label: "5ème", languageSystem: "FRANCOPHONE", schoolId: null },
    select: { id: true },
  });
  if (!level6e || !level5e) {
    throw new Error(
      "Niveaux nationaux 6ème/5ème introuvables (référentiel non seedé ?)",
    );
  }

  const school = await prisma.school.upsert({
    where: { slug: SCHOOL_SLUG },
    create: {
      slug: SCHOOL_SLUG,
      name: "Collège Vogt QA Promotion",
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
      where: { schoolId_label: { schoolId: school.id, label: "2025-2026" } },
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
      name: "6eA",
    },
  });

  const admin = await ensureUser({
    email: "admin.promo-qa@scolive.test",
    firstName: "Cécile",
    lastName: "Ndongo",
    gender: "F",
    activeRole: "SCHOOL_ADMIN",
    activeSchoolId: school.id,
  });
  await ensureMembership(admin.id, school.id, "SCHOOL_ADMIN");

  const teacher = await ensureUser({
    email: "teacher.promo-qa@scolive.test",
    firstName: "Albert",
    lastName: "Mvondo",
    gender: "M",
    activeRole: "TEACHER",
    activeSchoolId: school.id,
  });
  await ensureMembership(teacher.id, school.id, "TEACHER");

  const parent = await ensureUser({
    email: "parent.promo-qa@scolive.test",
    firstName: "Paul",
    lastName: "Talla",
    gender: "M",
    activeRole: "PARENT",
    activeSchoolId: school.id,
  });
  await ensureMembership(parent.id, school.id, "PARENT");

  if (!klass) {
    klass = await prisma.class.create({
      data: {
        schoolId: school.id,
        schoolYearId: activeSchoolYearId,
        name: "6eA",
        academicLevelId: level6e.id,
        referentTeacherUserId: teacher.id,
        capacity: 40,
      },
    });
  } else {
    klass = await prisma.class.update({
      where: { id: klass.id },
      data: { referentTeacherUserId: teacher.id, academicLevelId: level6e.id },
    });
  }

  const eloi = await ensureStudent({
    schoolId: school.id,
    firstName: "Eloi",
    lastName: "Talla",
    dateOfBirth: new Date("2013-02-10T00:00:00.000Z"),
  });
  const sarah = await ensureStudent({
    schoolId: school.id,
    firstName: "Sarah",
    lastName: "Talla",
    dateOfBirth: new Date("2013-11-22T00:00:00.000Z"),
  });

  for (const student of [eloi, sarah]) {
    await prisma.parentStudent.upsert({
      where: {
        parentUserId_studentId: {
          parentUserId: parent.id,
          studentId: student.id,
        },
      },
      create: {
        schoolId: school.id,
        parentUserId: parent.id,
        studentId: student.id,
      },
      update: {},
    });
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
        academicLevelId: level6e.id,
        status: "ACTIVE",
      },
      update: { classId: klass.id },
    });
  }

  // ── Bulletins TERM_3 remplis et publiés, décision pas encore prise ────────
  for (const [student, appreciation] of [
    [eloi, "Bon trimestre, résultats en nette progression. Élève sérieux."],
    [sarah, "Trimestre correct mais des lacunes en mathématiques à combler."],
  ]) {
    for (const term of ["TERM_1", "TERM_2", "TERM_3"]) {
      const existing = await prisma.studentTermReport.findFirst({
        where: {
          schoolYearId: activeSchoolYearId,
          classId: klass.id,
          studentId: student.id,
          term,
        },
        select: { id: true },
      });
      if (existing) continue;
      await prisma.studentTermReport.create({
        data: {
          schoolId: school.id,
          schoolYearId: activeSchoolYearId,
          classId: klass.id,
          studentId: student.id,
          term,
          status: term === "TERM_3" ? "PUBLISHED" : "PUBLISHED",
          councilHeldAt: term === "TERM_3" ? new Date() : null,
          generalAppreciation: appreciation,
          publishedAt: new Date(),
          updatedByUserId: teacher.id,
        },
      });
    }
  }

  // ── Échéancier de frais pour le niveau CIBLE (5ème), année en cours :
  //    sera copié automatiquement sur l'année suivante dès qu'une décision de
  //    passage est enregistrée (EnrollmentsService.ensureNextSchoolYearExists).
  const existingSchedule = await prisma.feeSchedule.findFirst({
    where: {
      schoolId: school.id,
      schoolYearId: activeSchoolYearId,
      academicLevelId: level5e.id,
      trackId: null,
    },
    select: { id: true },
  });
  if (!existingSchedule) {
    const in10Days = new Date();
    in10Days.setDate(in10Days.getDate() + 10);
    const in60Days = new Date();
    in60Days.setDate(in60Days.getDate() + 60);
    await prisma.feeSchedule.create({
      data: {
        schoolId: school.id,
        schoolYearId: activeSchoolYearId,
        academicLevelId: level5e.id,
        installments: {
          create: [
            {
              schoolId: school.id,
              rank: 1,
              label: "1ère tranche",
              amount: 50000,
              dueDate: in10Days,
            },
            {
              schoolId: school.id,
              rank: 2,
              label: "2ème tranche",
              amount: 40000,
              dueDate: in60Days,
            },
          ],
        },
      },
    });
  }

  // ── Liste de fournitures pour le niveau CIBLE (5ème), année en cours ──────
  const existingSupplyList = await prisma.supplyList.findFirst({
    where: {
      schoolId: school.id,
      schoolYearId: activeSchoolYearId,
      academicLevelId: level5e.id,
      trackId: null,
    },
    select: { id: true },
  });
  if (!existingSupplyList) {
    await prisma.supplyList.create({
      data: {
        schoolId: school.id,
        schoolYearId: activeSchoolYearId,
        academicLevelId: level5e.id,
        items: {
          create: [
            {
              schoolId: school.id,
              rank: 1,
              label: "Cahier grand format 200 pages",
              quantity: 10,
            },
            {
              schoolId: school.id,
              rank: 2,
              label: "Stylos bleu/noir/rouge",
              quantity: 6,
            },
            {
              schoolId: school.id,
              rank: 3,
              label: "Manuel de Mathématiques 5ème",
              quantity: 1,
              note: "Édition 2025",
            },
          ],
        },
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        school: { slug: school.slug, id: school.id },
        password: PASSWORD,
        accounts: {
          admin: admin.email,
          teacher: teacher.email,
          parent: parent.email,
        },
        class: { id: klass.id, name: klass.name },
        students: { eloiTalla: eloi.id, sarahTalla: sarah.id },
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
