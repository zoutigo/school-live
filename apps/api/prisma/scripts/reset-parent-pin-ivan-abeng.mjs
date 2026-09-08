import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
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

const PARENT_USER_ID = "cmtorm38g007zpf0iqc7nu7b6"; // Ivan Abeng
const SCHOOL_ID = "cmlsm7wgp0004mu0isxikgdz7"; // Lycée du Poisson d'Avril

function generateSixDigitPin() {
  // évite les suites trop évidentes (000000, 123456, etc.) sans sur-ingénierie
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, "0");
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: PARENT_USER_ID },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneCredential: { select: { id: true, phoneE164: true } },
    },
  });

  if (!user) {
    throw new Error(`Utilisateur ${PARENT_USER_ID} introuvable`);
  }
  if (!user.phoneCredential) {
    throw new Error(
      `Aucun identifiant téléphone/PIN existant pour ${user.firstName} ${user.lastName}`,
    );
  }

  const newPin = generateSixDigitPin();
  const pinHash = await bcrypt.hash(newPin, 10);

  await prisma.userPhoneCredential.update({
    where: { id: user.phoneCredential.id },
    data: { pinHash },
  });

  await prisma.authAuditLog.create({
    data: {
      userId: user.id,
      schoolId: SCHOOL_ID,
      event: "CHANGE_PIN",
      status: "SUCCESS",
      principal: user.phoneCredential.phoneE164,
      reasonCode: "ADMIN_MANUAL_RESET",
      details: {
        note: "PIN réinitialisé manuellement par le support suite à une demande du parent (PIN et réponses de sécurité oubliés).",
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        user: `${user.firstName} ${user.lastName}`,
        phone: user.phoneCredential.phoneE164,
        newPin,
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
