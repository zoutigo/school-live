/**
 * Seed de production : crée les établissements secondaires du Mfoundi
 * (Yaoundé) recensés par la DDES Mfoundi comme des "coquilles" School
 * (+ année scolaire active), sans compte admin ni membership — contrairement
 * à seed-mfoundi-schools.mjs (dev/démo), qui rattache un enseignant de test.
 *
 * Chaque école reçoit son cycle et son languageSystem (voir
 * mfoundi-schools.data.mjs), ce qui suffit à faire apparaître automatiquement
 * le sous-ensemble pertinent du catalogue national (niveaux + curriculums)
 * dans ses listes, via le filtrage strict de ManagementService.
 *
 * Prérequis : lancer npm run seed:national:catalog avant (ou après, l'ordre
 * n'a pas d'importance) pour que le catalogue national existe.
 *
 * Usage : node prisma/scripts/seed-mfoundi-schools-production.mjs
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

const prisma = new PrismaClient();

function defaultSchoolYearLabel(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const startYear = month >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

async function ensureSchool(entry) {
  const school = await prisma.school.upsert({
    where: { slug: entry.slug },
    create: {
      slug: entry.slug,
      name: entry.name,
      country: "Cameroun",
      region: "Centre",
      city: "Yaoundé",
      schoolType: entry.schoolType,
      ownership: entry.ownership,
      foundedYear: entry.foundedYear,
      languageSystem: entry.languageSystem,
      cycle: entry.cycle,
    },
    update: {
      schoolType: entry.schoolType,
      ownership: entry.ownership,
      foundedYear: entry.foundedYear,
      languageSystem: entry.languageSystem,
      cycle: entry.cycle,
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

async function main() {
  const summary = [];

  for (const entry of withUniqueSlugs(MFOUNDI_SCHOOLS)) {
    const school = await ensureSchool(entry);
    summary.push({
      slug: school.slug,
      name: school.name,
      schoolId: school.id,
      cycle: school.cycle,
      languageSystem: school.languageSystem,
      schoolType: school.schoolType,
    });
  }

  console.log(
    JSON.stringify({ totalSchools: summary.length, schools: summary }, null, 2),
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
