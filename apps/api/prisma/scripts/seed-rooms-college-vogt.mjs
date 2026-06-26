/**
 * Seed : ajoute des salles supplémentaires pour le collège Vogt
 * Usage : node prisma/scripts/seed-rooms-college-vogt.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXTRA_ROOMS = [
  { name: "Salle Info 1", capacity: 30, maxConcurrentSlots: 1 },
  { name: "Salle Info 2", capacity: 30, maxConcurrentSlots: 1 },
  { name: "Amphi A", capacity: 120, maxConcurrentSlots: 1 },
  { name: "Salle Musique", capacity: 25, maxConcurrentSlots: 1 },
  { name: "Gymnase", capacity: 60, maxConcurrentSlots: 2 },
  { name: "Bibliothèque", capacity: 40, maxConcurrentSlots: 1 },
  { name: "D01", capacity: null, maxConcurrentSlots: 1 },
  { name: "D02", capacity: null, maxConcurrentSlots: 1 },
];

async function main() {
  const school = await prisma.school.findFirst({
    where: { slug: "college-vogt" },
    select: { id: true, name: true },
  });

  if (!school) {
    console.error("École 'college-vogt' introuvable.");
    process.exit(1);
  }

  console.log(`École : ${school.name} (${school.id})`);

  let created = 0;
  let skipped = 0;

  for (const room of EXTRA_ROOMS) {
    const result = await prisma.room.upsert({
      where: {
        schoolId_name: { schoolId: school.id, name: room.name },
      },
      create: {
        schoolId: school.id,
        name: room.name,
        capacity: room.capacity,
        maxConcurrentSlots: room.maxConcurrentSlots,
        status: "AVAILABLE",
      },
      update: {},
    });

    const isNew =
      result.createdAt.getTime() === result.updatedAt.getTime() ||
      Math.abs(result.createdAt.getTime() - Date.now()) < 5000;
    if (isNew) {
      console.log(`  + Créée : ${room.name}`);
      created++;
    } else {
      console.log(`  ~ Existante : ${room.name}`);
      skipped++;
    }
  }

  const total = await prisma.room.count({ where: { schoolId: school.id } });
  console.log(
    `\nTerminé : ${created} créée(s), ${skipped} ignorée(s). Total école : ${total} salle(s).`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
