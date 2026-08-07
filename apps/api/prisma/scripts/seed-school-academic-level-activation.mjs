import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

/**
 * Backfill de SchoolAcademicLevel : active, pour chaque ecole, tous les
 * niveaux nationaux deja utilises par au moins une classe de cette ecole.
 * Necessaire pour ne pas faire disparaitre de la liste "Decision" les
 * niveaux deja en usage au moment ou l'activation devient obligatoire.
 */
async function main() {
  const summary = { schoolsProcessed: 0, activationsCreated: 0 };

  const schools = await prisma.school.findMany({ select: { id: true } });

  for (const school of schools) {
    summary.schoolsProcessed += 1;

    const usedNationalLevelIds = await prisma.class.findMany({
      where: {
        schoolId: school.id,
        academicLevelId: { not: null },
        academicLevel: { schoolId: null },
      },
      select: { academicLevelId: true },
      distinct: ["academicLevelId"],
    });

    for (const { academicLevelId } of usedNationalLevelIds) {
      if (!academicLevelId) continue;
      const created = await prisma.schoolAcademicLevel.upsert({
        where: {
          schoolId_academicLevelId: {
            schoolId: school.id,
            academicLevelId,
          },
        },
        create: { schoolId: school.id, academicLevelId },
        update: {},
      });
      if (created) summary.activationsCreated += 1;
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
