import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

// Catalogue national (schoolId = null) utilisé par le module Ressources pour que la
// recherche par niveau/matière soit cohérente entre toutes les écoles. Bootstrap minimal,
// complétable ensuite via l'écran d'admin platform (AcademicLevel/Subject nationaux).
const NATIONAL_ACADEMIC_LEVELS = [
  { code: "6EME", label: "6ème" },
  { code: "5EME", label: "5ème" },
  { code: "4EME", label: "4ème" },
  { code: "3EME", label: "3ème" },
  { code: "2NDE", label: "2nde" },
  { code: "1ERE", label: "1ère" },
  { code: "TLE", label: "Terminale" },
];

const NATIONAL_SUBJECTS = [
  { code: "FR", name: "Français" },
  { code: "MATH", name: "Mathématiques" },
  { code: "ANG", name: "Anglais" },
  { code: "HIST", name: "Histoire" },
  { code: "GEO", name: "Géographie" },
  { code: "SVT", name: "SVT" },
  { code: "PHYS", name: "Physique" },
  { code: "CHIM", name: "Chimie" },
  { code: "TECH", name: "Technologie" },
  { code: "EC", name: "Éducation civique" },
  { code: "EPS", name: "EPS" },
  { code: "ART", name: "Arts plastiques" },
  { code: "MUS", name: "Musique" },
];

async function main() {
  const summary = { academicLevelsCreated: 0, subjectsCreated: 0 };

  for (const level of NATIONAL_ACADEMIC_LEVELS) {
    const existing = await prisma.academicLevel.findFirst({
      where: { schoolId: null, code: level.code },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.academicLevel.create({
      data: { schoolId: null, code: level.code, label: level.label },
    });
    summary.academicLevelsCreated += 1;
  }

  for (const subject of NATIONAL_SUBJECTS) {
    const existing = await prisma.subject.findFirst({
      where: { schoolId: null, name: subject.name },
      select: { id: true, code: true },
    });
    if (existing) {
      if (!existing.code) {
        await prisma.subject.update({
          where: { id: existing.id },
          data: { code: subject.code },
        });
      }
      continue;
    }
    await prisma.subject.create({
      data: { schoolId: null, code: subject.code, name: subject.name },
    });
    summary.subjectsCreated += 1;
  }

  console.log("Seed catalogue national Ressources terminé :", summary);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
