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
 * Filières (séries) nationales du second cycle secondaire camerounais.
 * Chaque filière est rattachée aux niveaux de fin de cycle (2nde/1ère/Tle en
 * francophone, Lower/Upper Sixth en anglophone) via un Curriculum national
 * (schoolId: null) distinct du curriculum "tronc commun" existant.
 *
 * Les matières listées sont une simplification raisonnable du programme
 * MINESEC (cf. recherche fournie par l'utilisateur) : elles couvrent les
 * dominantes de chaque série sans prétendre à l'exhaustivité officielle.
 */

const FRANCOPHONE_LEVEL_CODES = ["2NDE", "1ERE", "TLE"];
const ANGLOPHONE_LEVEL_CODES = ["LSIX", "USIX"];

// Matières additionnelles non présentes dans le tronc commun existant.
const EXTRA_SUBJECTS_FR = [
  { code: "PHILO", name: "Philosophie" },
  { code: "LATIN", name: "Latin" },
  { code: "GREC", name: "Grec" },
  { code: "LV2", name: "Deuxième langue vivante" },
  { code: "LV3", name: "Troisième langue vivante" },
  { code: "INFO", name: "Informatique" },
];

const EXTRA_SUBJECTS_EN = [
  { code: "LIT_EN", name: "Literature in English" },
  { code: "ECON_EN", name: "Economics" },
  { code: "PHIL_EN", name: "Philosophy" },
  { code: "CS_EN", name: "Computer Science" },
  { code: "CINE_EN", name: "Cinematography" },
  { code: "NLC_EN", name: "National Language and Culture" },
];

const FRANCOPHONE_TRACKS = [
  {
    code: "A1",
    label: "A1 — Lettres, Latin, Grec",
    subjects: [
      "FR",
      "LATIN",
      "GREC",
      "PHILO",
      "HIST",
      "GEO",
      "ANG",
      "MATH",
      "INFO",
      "EPS",
    ],
  },
  {
    code: "A2",
    label: "A2 — Lettres, Latin, LV2",
    subjects: [
      "FR",
      "LATIN",
      "LV2",
      "PHILO",
      "HIST",
      "GEO",
      "ANG",
      "MATH",
      "INFO",
      "EPS",
    ],
  },
  {
    code: "A3",
    label: "A3 — Lettres, Latin",
    subjects: [
      "FR",
      "LATIN",
      "PHILO",
      "HIST",
      "GEO",
      "ANG",
      "MATH",
      "INFO",
      "EPS",
    ],
  },
  {
    code: "A4",
    label: "A4 — Lettres, LV2, Philosophie",
    subjects: [
      "FR",
      "LV2",
      "PHILO",
      "HIST",
      "GEO",
      "ANG",
      "MATH",
      "INFO",
      "EPS",
    ],
  },
  {
    code: "A5",
    label: "A5 — Langues vivantes",
    subjects: [
      "FR",
      "LV2",
      "LV3",
      "PHILO",
      "HIST",
      "GEO",
      "ANG",
      "INFO",
      "EPS",
    ],
  },
  {
    code: "AC",
    label: "AC — Art cinématographique",
    subjects: ["FR", "HIST", "GEO", "ANG", "PHILO", "INFO", "ART", "EPS"],
  },
  {
    code: "C",
    label: "C — Mathématiques et sciences physiques",
    subjects: [
      "MATH",
      "PHYS",
      "CHIM",
      "SVT",
      "FR",
      "ANG",
      "PHILO",
      "HIST",
      "GEO",
      "INFO",
      "EPS",
    ],
  },
  {
    code: "D",
    label: "D — Sciences de la vie et de la Terre",
    subjects: [
      "SVT",
      "MATH",
      "PHYS",
      "CHIM",
      "FR",
      "ANG",
      "PHILO",
      "HIST",
      "GEO",
      "INFO",
      "EPS",
    ],
  },
  {
    code: "TI",
    label: "TI — Technologies de l'information",
    subjects: [
      "INFO",
      "MATH",
      "PHYS",
      "TECH",
      "FR",
      "ANG",
      "PHILO",
      "HIST",
      "GEO",
      "EPS",
    ],
  },
  {
    code: "BIL",
    label: "BIL — Bilingue",
    subjects: ["FR", "ANG", "HIST", "GEO", "PHILO", "MATH", "SVT", "INFO"],
  },
];

const ANGLOPHONE_TRACKS = [
  {
    code: "ARTS_A1",
    label: "Arts A1 — French, Literature, History",
    subjects: ["FR_EN", "LIT_EN", "HIST_EN"],
  },
  {
    code: "ARTS_A2",
    label: "Arts A2 — Geography, Economics, History",
    subjects: ["GEO_EN", "ECON_EN", "HIST_EN"],
  },
  {
    code: "ARTS_A3",
    label: "Arts A3 — Literature, History, Economics",
    subjects: ["LIT_EN", "HIST_EN", "ECON_EN"],
  },
  {
    code: "ARTS_A4",
    label: "Arts A4 — Geography, Economics, Mathematics",
    subjects: ["GEO_EN", "ECON_EN", "MATHS_EN"],
  },
  {
    code: "ARTS_A5",
    label: "Arts A5 — Literature, Philosophy, Mathematics",
    subjects: ["LIT_EN", "PHIL_EN", "MATHS_EN"],
  },
  {
    code: "ARTS_A6",
    label: "Arts A6 — Literature, French, foreign language",
    subjects: ["LIT_EN", "FR_EN"],
  },
  {
    code: "ARTS_A7",
    label: "Arts A7 — Literature, Cinematography, Computer Science",
    subjects: ["LIT_EN", "CINE_EN", "CS_EN"],
  },
  {
    code: "ARTS_A8",
    label: "Arts A8 — Arts and Crafts, National Language and Culture",
    subjects: ["ART_EN", "NLC_EN"],
  },
  {
    code: "SCI_S1",
    label: "Science S1 — Chemistry, Physics, Mathematics",
    subjects: ["CHEM_EN", "PHYS_EN", "MATHS_EN"],
  },
  {
    code: "SCI_S2",
    label: "Science S2 — Chemistry, Physics, Biology",
    subjects: ["CHEM_EN", "PHYS_EN", "BIO_EN"],
  },
  {
    code: "SCI_S3",
    label: "Science S3 — Biology, Chemistry, Physics",
    subjects: ["BIO_EN", "CHEM_EN", "PHYS_EN"],
  },
  {
    code: "SCI_S4",
    label: "Science S4 — Biology, Chemistry, Geography",
    subjects: ["BIO_EN", "CHEM_EN", "GEO_EN"],
  },
];

async function upsertSubject(code, name) {
  const existing = await prisma.subject.findFirst({
    where: { schoolId: null, name },
    select: { id: true },
  });
  if (existing) return existing;
  return prisma.subject.create({ data: { schoolId: null, code, name } });
}

async function findLevelId(code) {
  const level = await prisma.academicLevel.findFirst({
    where: { schoolId: null, code },
    select: { id: true },
  });
  if (!level) {
    throw new Error(
      `AcademicLevel "${code}" introuvable — lancer d'abord seed-national-catalog.mjs`,
    );
  }
  return level.id;
}

async function findSubjectId(code) {
  const subject = await prisma.subject.findFirst({
    where: { schoolId: null, code },
    select: { id: true },
  });
  if (!subject) {
    throw new Error(`Subject "${code}" introuvable`);
  }
  return subject.id;
}

async function ensureTrack(code, label) {
  const existing = await prisma.track.findFirst({
    where: { schoolId: null, code },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.track.create({
    data: { schoolId: null, code, label },
  });
  return created.id;
}

async function ensureTrackCurriculum(academicLevelId, trackId, name) {
  const existing = await prisma.curriculum.findFirst({
    where: { schoolId: null, academicLevelId, trackId },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.curriculum.create({
    data: { schoolId: null, academicLevelId, trackId, name },
  });
  return created.id;
}

async function ensureCurriculumSubject(curriculumId, subjectId) {
  const existing = await prisma.curriculumSubject.findFirst({
    where: { schoolId: null, curriculumId, subjectId },
    select: { id: true },
  });
  if (existing) return false;
  await prisma.curriculumSubject.create({
    data: { schoolId: null, curriculumId, subjectId, isMandatory: true },
  });
  return true;
}

async function seedTrackGroup(levelCodes, tracks) {
  const summary = {
    tracksCreated: 0,
    curriculumsCreated: 0,
    curriculumSubjectsCreated: 0,
  };

  for (const levelCode of levelCodes) {
    const academicLevelId = await findLevelId(levelCode);

    for (const track of tracks) {
      const trackBefore = await prisma.track.count({
        where: { schoolId: null, code: track.code },
      });
      const trackId = await ensureTrack(track.code, track.label);
      if (trackBefore === 0) summary.tracksCreated += 1;

      const curriculumBefore = await prisma.curriculum.count({
        where: { schoolId: null, academicLevelId, trackId },
      });
      const curriculumId = await ensureTrackCurriculum(
        academicLevelId,
        trackId,
        `${levelCode} - ${track.code}`,
      );
      if (curriculumBefore === 0) summary.curriculumsCreated += 1;

      for (const subjectCode of track.subjects) {
        const subjectId = await findSubjectId(subjectCode);
        const created = await ensureCurriculumSubject(curriculumId, subjectId);
        if (created) summary.curriculumSubjectsCreated += 1;
      }
    }
  }

  return summary;
}

async function main() {
  let subjectsCreated = 0;
  for (const subject of [...EXTRA_SUBJECTS_FR, ...EXTRA_SUBJECTS_EN]) {
    const before = await prisma.subject.count({
      where: { schoolId: null, name: subject.name },
    });
    await upsertSubject(subject.code, subject.name);
    if (before === 0) subjectsCreated += 1;
  }

  const fr = await seedTrackGroup(FRANCOPHONE_LEVEL_CODES, FRANCOPHONE_TRACKS);
  const en = await seedTrackGroup(ANGLOPHONE_LEVEL_CODES, ANGLOPHONE_TRACKS);

  console.log(
    JSON.stringify(
      {
        subjectsCreated,
        francophone: fr,
        anglophone: en,
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
