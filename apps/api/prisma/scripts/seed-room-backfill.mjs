import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const POLYVALENT_NAME_HINTS = ["gymnase", "gym", "polyvalente", "polyvalent"];

const MODELS = [
  { delegate: "classTimetableSlot", label: "ClassTimetableSlot" },
  { delegate: "classTimetableOneOffSlot", label: "ClassTimetableOneOffSlot" },
  {
    delegate: "classTimetableSlotException",
    label: "ClassTimetableSlotException",
  },
];

function normalizeKey(room) {
  return room.trim().toLowerCase().replace(/\s+/g, " ");
}

function looksPolyvalent(name) {
  const lower = name.toLowerCase();
  return POLYVALENT_NAME_HINTS.some((hint) => lower.includes(hint));
}

async function main() {
  const schools = await prisma.school.findMany({
    select: { id: true, slug: true },
  });

  const summary = {
    schoolsProcessed: schools.length,
    roomsCreated: 0,
    rowsLinked: {
      ClassTimetableSlot: 0,
      ClassTimetableOneOffSlot: 0,
      ClassTimetableSlotException: 0,
    },
    unresolvedRows: [],
  };

  for (const school of schools) {
    /** @type {Map<string, { name: string, roomId: string | null }>} */
    const roomsByKey = new Map();

    for (const { delegate, label } of MODELS) {
      const rows = await prisma[delegate].findMany({
        where: { schoolId: school.id, room: { not: null }, roomId: null },
        select: { id: true, room: true },
      });

      for (const row of rows) {
        const trimmed = (row.room ?? "").trim();
        if (!trimmed) continue;
        const key = normalizeKey(trimmed);
        if (!roomsByKey.has(key)) {
          roomsByKey.set(key, { name: trimmed, roomId: null });
        }
      }

      void label;
    }

    for (const [key, entry] of roomsByKey) {
      const room = await prisma.room.upsert({
        where: { schoolId_name: { schoolId: school.id, name: entry.name } },
        create: {
          schoolId: school.id,
          name: entry.name,
          maxConcurrentSlots: looksPolyvalent(entry.name) ? 9999 : 1,
        },
        update: {},
        select: { id: true },
      });

      const count = await prisma.room.count({
        where: { schoolId: school.id, name: entry.name },
      });
      if (count === 1) summary.roomsCreated += 1;

      roomsByKey.set(key, { ...entry, roomId: room.id });
    }

    for (const { delegate, label } of MODELS) {
      const rows = await prisma[delegate].findMany({
        where: { schoolId: school.id, room: { not: null }, roomId: null },
        select: { id: true, room: true },
      });

      for (const row of rows) {
        const trimmed = (row.room ?? "").trim();
        if (!trimmed) continue;
        const key = normalizeKey(trimmed);
        const match = roomsByKey.get(key);
        if (!match?.roomId) {
          summary.unresolvedRows.push({
            model: label,
            id: row.id,
            room: row.room,
          });
          continue;
        }
        await prisma[delegate].update({
          where: { id: row.id },
          data: { roomId: match.roomId },
        });
        summary.rowsLinked[label] += 1;
      }
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
