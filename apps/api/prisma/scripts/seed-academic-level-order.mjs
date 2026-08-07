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
 * Ordre pedagogique continu (primaire -> secondaire) par systeme linguistique,
 * utilise pour proposer automatiquement le niveau suivant lors d'une decision
 * "Promoted". Les codes hors de ces listes (niveaux propres a une ecole)
 * gardent un `order` a null : pas d'auto-suggestion, choix manuel.
 */
const NATIONAL_ORDER_SEQUENCES = {
  FRANCOPHONE: [
    "SIL",
    "CI",
    "CP",
    "CE1",
    "CE2",
    "CM1",
    "CM2",
    "6EME",
    "5EME",
    "4EME",
    "3EME",
    "2NDE",
    "1ERE",
    "TLE",
  ],
  ANGLOPHONE: [
    "CLASS1",
    "CLASS2",
    "CLASS3",
    "CLASS4",
    "CLASS5",
    "CLASS6",
    "FORM1",
    "FORM2",
    "FORM3",
    "FORM4",
    "FORM5",
    "LSIX",
    "USIX",
  ],
};

async function main() {
  const summary = { levelsUpdated: 0, levelsSkippedUnknownCode: [] };

  const nationalLevels = await prisma.academicLevel.findMany({
    where: { schoolId: null },
    select: { id: true, code: true, languageSystem: true },
  });

  for (const level of nationalLevels) {
    const sequence = level.languageSystem
      ? NATIONAL_ORDER_SEQUENCES[level.languageSystem]
      : undefined;
    const index = sequence?.indexOf(level.code) ?? -1;
    if (index === -1) {
      summary.levelsSkippedUnknownCode.push(level.code);
      continue;
    }
    await prisma.academicLevel.update({
      where: { id: level.id },
      data: { order: index + 1 },
    });
    summary.levelsUpdated += 1;
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
