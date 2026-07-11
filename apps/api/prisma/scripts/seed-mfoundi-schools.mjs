/**
 * Seed : ajoute 5 établissements secondaires du Mfoundi (Yaoundé) au catalogue
 * Scolive, en s'appuyant sur la liste officielle DDES Mfoundi
 * (ecole-secondaire-mfoundi.pdf, "Liste complète des établissements
 * secondaires du Mfoundi").
 *
 * Objectif : disposer de plusieurs écoles réalistes (au-delà de l'école
 * pilote college-vogt) pour tester le module Ressources en contexte
 * multi-école, et pour exercer le sélecteur d'école active.
 *
 * languageSystem : seul l'établissement explicitement marqué "Bilingue"
 * dans la colonne Système du PDF reçoit BILINGUAL ; tous les autres
 * établissements du Mfoundi (division de Yaoundé, zone francophone, aucune
 * mention "Anglophone" dans la source) reçoivent FRANCOPHONE par défaut.
 *
 * Usage : node prisma/scripts/seed-mfoundi-schools.mjs
 */
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MFOUNDI_SCHOOLS, slugify } from "./mfoundi-schools.data.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
for (const candidate of [
  path.resolve(__dirname, "../../../docker/.env"),
  path.resolve(__dirname, "../../.env"),
]) {
  dotenv.config({ path: candidate, override: false });
}

const prisma = new PrismaClient();

const TEACHER_EMAIL = "plizaweb@gmail.com";

function defaultSchoolYearLabel(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const startYear = month >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

async function ensureSchool(entry) {
  const slug = slugify(entry.name);

  const school = await prisma.school.upsert({
    where: { slug },
    create: {
      slug,
      name: entry.name,
      country: "Cameroun",
      region: "Centre",
      city: "Yaoundé",
      schoolType: entry.schoolType,
      ownership: entry.ownership,
      foundedYear: entry.foundedYear,
      languageSystem: entry.languageSystem,
    },
    update: {
      schoolType: entry.schoolType,
      ownership: entry.ownership,
      foundedYear: entry.foundedYear,
      languageSystem: entry.languageSystem,
    },
  });

  let activeSchoolYearId = school.activeSchoolYearId;
  if (!activeSchoolYearId) {
    const label = defaultSchoolYearLabel();
    const schoolYear = await prisma.schoolYear.upsert({
      where: { schoolId_label: { schoolId: school.id, label } },
      create: { schoolId: school.id, label },
      update: {},
      select: { id: true },
    });
    await prisma.school.update({
      where: { id: school.id },
      data: { activeSchoolYearId: schoolYear.id },
    });
    activeSchoolYearId = schoolYear.id;
  }

  return { ...school, activeSchoolYearId };
}

async function ensureMembership(userId, schoolId, role) {
  return prisma.schoolMembership.upsert({
    where: { userId_schoolId_role: { userId, schoolId, role } },
    create: { userId, schoolId, role },
    update: {},
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

  const summary = [];

  for (const entry of MFOUNDI_SCHOOLS) {
    const school = await ensureSchool(entry);
    await ensureMembership(teacher.id, school.id, "TEACHER");
    await ensureMembership(teacher.id, school.id, "SCHOOL_ADMIN");

    summary.push({
      slug: school.slug,
      name: school.name,
      schoolId: school.id,
      activeSchoolYearId: school.activeSchoolYearId,
      languageSystem: school.languageSystem,
    });
  }

  console.log(
    JSON.stringify({ teacherId: teacher.id, schools: summary }, null, 2),
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
