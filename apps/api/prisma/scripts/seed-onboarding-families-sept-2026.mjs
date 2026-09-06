import { PrismaClient } from "@prisma/client";
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

const MEDIA_BASE = (
  process.env.MEDIA_PUBLIC_BASE_URL ?? "http://localhost:9000/school-live-media"
).replace(/\/+$/, "");

const SCHOOL_ID = "cmlsm7wgp0004mu0isxikgdz7"; // Lycée du Poisson d'Avril
const SCHOOL_YEAR_ID = "cmlsm7wgp0003mu0ia1ux88xo"; // 2025-2026
const LEVEL_ID = "cmrgg7k6h000dnv6tnnvo84sc"; // 6ème

const CLASS_A = "cmlte7u3g0018ns0ixs1igaeh"; // 6eme A
const CLASS_B = "cmlte87s6001ans0ioihwxbnj"; // 6e B
const CLASS_C = "cmlte93w0001cns0itt27sroo"; // 6e C

const ADMIN = "cmlsm7wh80005mu0iz1v7lw3p"; // Emma MBELE, SCHOOL_ADMIN + Maths

const TEACHERS = {
  MATH: "cmlsm7wh80005mu0iz1v7lw3p", // Emma MBELE
  GEO: "cmo62ivo1003cl70i93znwnir", // Gallice Talla Talla
  ANG: "cmr31lugw002hrp0juzuf0sr2", // Anne Marie Leugeu
  FR: "cms3lot030009qi0ijo65yhi9", // Viviane Fopa
  ART: "cmr4sgftj0000mb0j8ygala5e", // William Tagal
  HIST: "cmlten0dq0027ns0il3ohmupv", // Georges Bertrand Fotsing
  TECH: "cmok9jck6003yp90i2v5ndn2m", // Aurelien Djoumessi
};

const SUBJECTS = {
  MATH: "cmrgg204y0003nv4ztupnu35x",
  GEO: "cmrgg7k520003nv6t52t5z56q",
  ANG: "cmrgg2061000fnv4zw5pmnfa6",
  FR: "cmrgg204r0001nv4z9d5psq88",
  ART: "cmrgg205o000bnv4zvcsuzcwb",
  HIST: "cmrgg7k4q0001nv6tqu33ny62",
  TECH: "cmrgg7k5s000bnv6t9sp4v6pb",
};

const EVAL_TYPES = {
  COMPOSITION: "cmms79v4r0005ok7uwbesj7jc",
  INTERROGATION: "cmms79v450001ok7u1qpcdn03",
  DEVOIR: "cmms79v4l0003ok7u8i6yrl17",
  ORAL: "cmms79v500009ok7unhqmkq3z",
  TP: "cmms79v4w0007ok7u5thi6ttc",
};

const ROOMS = {
  A01: "cmr35iwd50001rp9rigao83ex",
  A02: "cmr35iwdh0003rp9ri3j6fpim",
  A03: "cmr35iwdp0005rp9repdtil17",
  A04: "cmr35iwdy0007rp9r0nk4eb9o",
};

const FAMILIES = [
  {
    key: "julien",
    parentUserId: "cmtoadi7n0039o60iq68ao5am",
    parentName: "Oumarou Djibrilla",
    parentPhone: "+237670688878",
    studentId: "cmtoa6j000030o60iuh5ddti1",
    studentName: "Julien Mbappé",
    classId: CLASS_A,
    className: "6eme A",
    profile: 0.72, // bon élève
  },
  {
    key: "daniel",
    parentUserId: "cmtob9bb20040o60ih9it7mbi",
    parentName: "Jane Yebga",
    parentPhone: "+237695801545",
    studentId: "cmtoaa5pn0036o60ip6zrnvmk",
    studentName: "Daniel Amougou",
    classId: CLASS_B,
    className: "6e B",
    profile: 0.8, // excellent
  },
  {
    key: "lucie",
    parentUserId: "cmtobvt3r0004pf0i3rt9ncv7",
    parentName: "Moréa Zbo",
    parentPhone: "+237691231150",
    studentId: "cmtoa2arx002wo60inpvq7p9k",
    studentName: "Lucie Eboué",
    classId: CLASS_C,
    className: "6e C",
    profile: 0.6, // moyen+
  },
  {
    key: "fatou",
    parentUserId: "cmtocf2z00019pf0i5enwyiod",
    parentName: "Parent 9286",
    parentPhone: "+237659249286",
    studentId: "cmto9ye33002so60iuhf5cdn3",
    studentName: "Fatou Bana",
    classId: CLASS_C,
    className: "6e C",
    profile: 0.45, // en difficulté
  },
  {
    key: "michel",
    parentUserId: "cmtorm38g007zpf0iqc7nu7b6",
    parentName: "Ivan Abeng",
    parentPhone: "+237680013293",
    studentId: "cmto9mpxz002io60iqpw373pa",
    studentName: "michel Sadou",
    classId: CLASS_A,
    className: "6eme A",
    profile: 0.55, // moyen
  },
];

function iso(dateStr) {
  return new Date(dateStr);
}

function daysAgo(days, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysFromNow(days, hour = 9, minute = 0) {
  return daysAgo(-days, hour, minute);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function roundHalf(n) {
  return Math.round(n * 2) / 2;
}

// ---------------------------------------------------------------------------
// 1. 6eme A : rattrapage du contenu de classe (aucune donnée n'existait avant)
// ---------------------------------------------------------------------------

async function seedTeacherClassSubjectFor6emeA() {
  const rows = [
    { subjectId: SUBJECTS.MATH, teacherUserId: TEACHERS.MATH },
    { subjectId: SUBJECTS.FR, teacherUserId: TEACHERS.FR },
    { subjectId: SUBJECTS.ANG, teacherUserId: TEACHERS.ANG },
    { subjectId: SUBJECTS.HIST, teacherUserId: TEACHERS.HIST },
    { subjectId: SUBJECTS.GEO, teacherUserId: TEACHERS.GEO },
    { subjectId: SUBJECTS.ART, teacherUserId: TEACHERS.ART },
  ];
  let count = 0;
  for (const row of rows) {
    await prisma.teacherClassSubject.upsert({
      where: {
        schoolYearId_teacherUserId_classId_subjectId: {
          schoolYearId: SCHOOL_YEAR_ID,
          teacherUserId: row.teacherUserId,
          classId: CLASS_A,
          subjectId: row.subjectId,
        },
      },
      update: {},
      create: {
        schoolId: SCHOOL_ID,
        schoolYearId: SCHOOL_YEAR_ID,
        classId: CLASS_A,
        subjectId: row.subjectId,
        teacherUserId: row.teacherUserId,
      },
    });
    count += 1;
  }
  return count;
}

async function seedTimetableFor6emeA() {
  const slots = [
    {
      subject: SUBJECTS.MATH,
      teacher: TEACHERS.MATH,
      weekday: 2,
      start: 480,
      end: 540,
      room: "Salle A01",
      roomId: ROOMS.A01,
    },
    {
      subject: SUBJECTS.FR,
      teacher: TEACHERS.FR,
      weekday: 1,
      start: 540,
      end: 600,
      room: "Salle A01",
      roomId: ROOMS.A01,
    },
    {
      subject: SUBJECTS.ANG,
      teacher: TEACHERS.ANG,
      weekday: 2,
      start: 600,
      end: 660,
      room: "Salle A02",
      roomId: ROOMS.A02,
    },
    {
      subject: SUBJECTS.HIST,
      teacher: TEACHERS.HIST,
      weekday: 1,
      start: 480,
      end: 535,
      room: "Salle A03",
      roomId: ROOMS.A03,
    },
    {
      subject: SUBJECTS.GEO,
      teacher: TEACHERS.GEO,
      weekday: 5,
      start: 480,
      end: 535,
      room: "Salle A03",
      roomId: ROOMS.A03,
    },
    {
      subject: SUBJECTS.ART,
      teacher: TEACHERS.ART,
      weekday: 1,
      start: 660,
      end: 720,
      room: "Salle A02",
      roomId: ROOMS.A02,
    },
    {
      subject: SUBJECTS.TECH,
      teacher: TEACHERS.TECH,
      weekday: 4,
      start: 540,
      end: 600,
      room: "Salle A04",
      roomId: ROOMS.A04,
    },
  ];

  let count = 0;
  for (const slot of slots) {
    const existing = await prisma.classTimetableSlot.findFirst({
      where: {
        classId: CLASS_A,
        subjectId: slot.subject,
        weekday: slot.weekday,
        startMinute: slot.start,
      },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.classTimetableSlot.create({
      data: {
        schoolId: SCHOOL_ID,
        schoolYearId: SCHOOL_YEAR_ID,
        classId: CLASS_A,
        subjectId: slot.subject,
        teacherUserId: slot.teacher,
        weekday: slot.weekday,
        startMinute: slot.start,
        endMinute: slot.end,
        room: slot.room,
        roomId: slot.roomId,
        createdByUserId: ADMIN,
      },
    });
    count += 1;
  }
  return count;
}

const NEW_EVALUATIONS_A = [];
(function buildEvaluationsA() {
  const subjectSeq = [
    { key: "MATH", subjectId: SUBJECTS.MATH, teacher: TEACHERS.MATH },
    { key: "FR", subjectId: SUBJECTS.FR, teacher: TEACHERS.FR },
    { key: "ANG", subjectId: SUBJECTS.ANG, teacher: TEACHERS.ANG },
    { key: "HIST", subjectId: SUBJECTS.HIST, teacher: TEACHERS.HIST },
    { key: "GEO", subjectId: SUBJECTS.GEO, teacher: TEACHERS.GEO },
    { key: "ART", subjectId: SUBJECTS.ART, teacher: TEACHERS.ART },
    { key: "TECH", subjectId: SUBJECTS.TECH, teacher: TEACHERS.TECH },
  ];
  const sequences = [
    {
      seq: "SEQ_1",
      type: EVAL_TYPES.DEVOIR,
      max: 20,
      coef: 1,
      month: "2025-10",
    },
    {
      seq: "SEQ_2",
      type: EVAL_TYPES.INTERROGATION,
      max: 10,
      coef: 0.5,
      month: "2025-12",
    },
    {
      seq: "SEQ_3",
      type: EVAL_TYPES.COMPOSITION,
      max: 20,
      coef: 2,
      month: "2026-01",
    },
  ];
  const titles = {
    MATH: [
      "Nombres entiers",
      "Fractions simples",
      "Composition de Mathématiques",
    ],
    FR: ["Grammaire et conjugaison", "Dictée", "Composition de Français"],
    ANG: ["Vocabulaire de base", "Dialogue oral", "Composition d'Anglais"],
    HIST: ["La préhistoire", "L'Égypte antique", "Composition d'Histoire"],
    GEO: ["Le relief du Cameroun", "Les climats", "Composition de Géographie"],
    ART: ["Couleurs primaires", "Croquis d'objet", "Projet créatif final"],
    TECH: ["Sécurité à l'atelier", "Schéma technique", "Projet technologique"],
  };
  let day = 8;
  for (const subj of subjectSeq) {
    sequences.forEach((s, idx) => {
      NEW_EVALUATIONS_A.push({
        key: `${subj.key}_${s.seq}`,
        subjectId: subj.subjectId,
        teacherUserId: subj.teacher,
        sequence: s.seq,
        typeId: s.type,
        maxScore: s.max,
        coefficient: s.coef,
        title: titles[subj.key][idx],
        date: `${s.month}-${String(10 + ((day + idx * 3) % 15)).padStart(2, "0")}T08:00:00Z`,
      });
    });
    day += 2;
  }
})();

async function seedEvaluationsFor6emeA() {
  const createdByKey = {};
  for (const ev of NEW_EVALUATIONS_A) {
    const existing = await prisma.evaluation.findFirst({
      where: {
        classId: CLASS_A,
        subjectId: ev.subjectId,
        sequence: ev.sequence,
        title: ev.title,
      },
      select: { id: true },
    });
    if (existing) {
      createdByKey[ev.key] = existing.id;
      continue;
    }
    const created = await prisma.evaluation.create({
      data: {
        schoolId: SCHOOL_ID,
        schoolYearId: SCHOOL_YEAR_ID,
        classId: CLASS_A,
        subjectId: ev.subjectId,
        evaluationTypeId: ev.typeId,
        authorUserId: ev.teacherUserId,
        title: ev.title,
        coefficient: ev.coefficient,
        maxScore: ev.maxScore,
        sequence: ev.sequence,
        status: "PUBLISHED",
        scheduledAt: iso(ev.date),
        publishedAt: iso(ev.date),
      },
      select: { id: true },
    });
    createdByKey[ev.key] = created.id;
  }
  return createdByKey;
}

const FEED_POSTS_A = [
  {
    type: "POST",
    authorUserId: TEACHERS.MATH,
    title: "Bienvenue en 6eme A",
    bodyHtml:
      "<p>Bienvenue à toutes et à tous en 6ème A pour cette nouvelle année scolaire ! N'hésitez pas à consulter le fil de classe régulièrement pour les annonces importantes.</p>",
    createdAt: "2025-09-02T08:00:00Z",
  },
  {
    type: "POST",
    authorUserId: TEACHERS.HIST,
    title: "Fournitures pour le cours d'Histoire-Géographie",
    bodyHtml:
      "<p>Merci de vous procurer un cahier grand format 96 pages et une pochette de crayons de couleur pour les cartes.</p>",
    createdAt: "2025-09-05T09:00:00Z",
  },
  {
    type: "POLL",
    authorUserId: TEACHERS.FR,
    title: "Choix du livre de lecture suivie",
    bodyHtml: "<p>Merci de voter pour le prochain livre étudié en classe.</p>",
    pollQuestion: "Quel livre souhaitez-vous étudier ?",
    pollOptions: ["Contes du Cameroun", "Le Petit Prince", "Un sac de billes"],
    createdAt: "2025-09-10T10:00:00Z",
  },
  {
    type: "POST",
    authorUserId: TEACHERS.TECH,
    title: "Consignes de sécurité à l'atelier",
    bodyHtml:
      "<p>Rappel : le port de la blouse est obligatoire pour toutes les séances de technologie à l'atelier.</p>",
    createdAt: "2025-10-01T09:30:00Z",
  },
  {
    type: "POLL",
    authorUserId: TEACHERS.ART,
    title: "Thème du projet créatif du trimestre",
    bodyHtml:
      "<p>Votez pour le thème du prochain projet d'arts plastiques.</p>",
    pollQuestion: "Quel thème préférez-vous ?",
    pollOptions: ["Le portrait", "Le paysage camerounais", "L'art abstrait"],
    createdAt: "2025-11-05T09:00:00Z",
  },
  {
    type: "POST",
    authorUserId: TEACHERS.GEO,
    title: "Sortie pédagogique - Musée National",
    bodyHtml:
      "<p>Une sortie au musée national est prévue le mois prochain. L'autorisation de sortie sera distribuée prochainement.</p>",
    createdAt: "2025-11-20T11:00:00Z",
  },
];

async function seedFeedFor6emeA() {
  let postCount = 0;
  let voteCount = 0;
  for (const post of FEED_POSTS_A) {
    const existing = await prisma.feedPost.findFirst({
      where: { audienceClassId: CLASS_A, title: post.title },
      select: { id: true },
    });
    if (existing) continue;

    const pollOptions =
      post.type === "POLL"
        ? post.pollOptions.map((label, idx) => ({
            id: `opt-${idx + 1}`,
            label,
            votes: 0,
          }))
        : undefined;

    const row = await prisma.feedPost.create({
      data: {
        schoolId: SCHOOL_ID,
        authorUserId: post.authorUserId,
        type: post.type,
        title: post.title,
        bodyHtml: post.bodyHtml,
        audienceScope: "CLASS",
        audienceLabel: "6eme A",
        audienceLevelId: LEVEL_ID,
        audienceClassId: CLASS_A,
        pollQuestion: post.type === "POLL" ? post.pollQuestion : null,
        pollOptionsJson: pollOptions,
        createdAt: iso(post.createdAt),
      },
      select: { id: true },
    });
    postCount += 1;

    if (post.type === "POLL" && pollOptions) {
      const voters = [
        TEACHERS.MATH,
        TEACHERS.HIST,
        TEACHERS.GEO,
        TEACHERS.ART,
      ].filter((id) => id !== post.authorUserId);
      const counts = pollOptions.map((o) => ({ ...o }));
      for (const [idx, voterId] of voters.entries()) {
        const option = counts[idx % counts.length];
        option.votes += 1;
        await prisma.feedPollVote.upsert({
          where: { postId_userId: { postId: row.id, userId: voterId } },
          update: { optionId: option.id },
          create: {
            postId: row.id,
            schoolId: SCHOOL_ID,
            userId: voterId,
            optionId: option.id,
          },
        });
        voteCount += 1;
      }
      await prisma.feedPost.update({
        where: { id: row.id },
        data: { pollOptionsJson: counts },
      });
    }
  }
  return { postCount, voteCount };
}

const HOMEWORK_A = [
  {
    subjectId: SUBJECTS.MATH,
    teacherUserId: TEACHERS.MATH,
    title: "Exercices sur les nombres entiers",
    contentHtml:
      "<p>Faire les exercices 3, 4 et 5 page 12 pour le prochain cours.</p>",
    expectedAt: "2025-10-15T07:00:00Z",
  },
  {
    subjectId: SUBJECTS.FR,
    teacherUserId: TEACHERS.FR,
    title: "Apprendre la conjugaison du présent",
    contentHtml:
      "<p>Réviser la conjugaison des verbes du premier groupe au présent.</p>",
    expectedAt: "2025-10-20T07:00:00Z",
  },
  {
    subjectId: SUBJECTS.HIST,
    teacherUserId: TEACHERS.HIST,
    title: "Résumé sur la préhistoire",
    contentHtml:
      "<p>Préparer un résumé d'une demi-page sur les grandes périodes de la préhistoire.</p>",
    expectedAt: "2025-11-03T07:00:00Z",
  },
];

async function seedHomeworkFor6emeA() {
  const ids = {};
  for (const hw of HOMEWORK_A) {
    let row = await prisma.homework.findFirst({
      where: { classId: CLASS_A, title: hw.title },
      select: { id: true },
    });
    if (!row) {
      row = await prisma.homework.create({
        data: {
          schoolId: SCHOOL_ID,
          schoolYearId: SCHOOL_YEAR_ID,
          classId: CLASS_A,
          subjectId: hw.subjectId,
          authorUserId: hw.teacherUserId,
          title: hw.title,
          contentHtml: hw.contentHtml,
          expectedAt: iso(hw.expectedAt),
        },
        select: { id: true },
      });
    }
    ids[hw.title] = row.id;
  }
  return ids;
}

// ---------------------------------------------------------------------------
// 2. Barème financier du niveau 6ème (inexistant jusqu'ici pour toute l'école)
// ---------------------------------------------------------------------------

async function seedFeeSchedule() {
  let schedule = await prisma.feeSchedule.findFirst({
    where: {
      schoolId: SCHOOL_ID,
      schoolYearId: SCHOOL_YEAR_ID,
      academicLevelId: LEVEL_ID,
    },
    select: { id: true },
  });
  let installments;
  if (!schedule) {
    schedule = await prisma.feeSchedule.create({
      data: {
        schoolId: SCHOOL_ID,
        schoolYearId: SCHOOL_YEAR_ID,
        academicLevelId: LEVEL_ID,
      },
      select: { id: true },
    });
    installments = await Promise.all(
      [
        {
          rank: 1,
          label: "1er trimestre",
          amount: 75000,
          dueDate: "2025-10-05T00:00:00Z",
        },
        {
          rank: 2,
          label: "2e trimestre",
          amount: 75000,
          dueDate: "2026-01-10T00:00:00Z",
        },
        {
          rank: 3,
          label: "3e trimestre",
          amount: 60000,
          dueDate: "2026-04-06T00:00:00Z",
        },
      ].map((inst) =>
        prisma.feeInstallment.create({
          data: {
            schoolId: SCHOOL_ID,
            feeScheduleId: schedule.id,
            rank: inst.rank,
            label: inst.label,
            amount: inst.amount,
            dueDate: iso(inst.dueDate),
          },
        }),
      ),
    );
  } else {
    installments = await prisma.feeInstallment.findMany({
      where: { feeScheduleId: schedule.id },
      orderBy: { rank: "asc" },
    });
  }
  return installments;
}

// ---------------------------------------------------------------------------
// 3. Données par élève / famille
// ---------------------------------------------------------------------------

async function seedScoresForStudent(family, evaluations) {
  let count = 0;
  for (const ev of evaluations) {
    const existing = await prisma.studentEvaluationScore.findFirst({
      where: { evaluationId: ev.id, studentId: family.studentId },
      select: { id: true },
    });
    if (existing) continue;

    const roll = Math.random();
    let score = null;
    let status = "ENTERED";
    if (roll < 0.05) {
      status = "ABSENT";
    } else if (roll < 0.08) {
      status = "EXCUSED";
    } else if (roll < 0.11) {
      status = "NOT_GRADED";
    } else {
      const mean = family.profile * ev.maxScore;
      const spread = ev.maxScore * 0.18;
      score = roundHalf(
        Math.min(ev.maxScore, Math.max(0, mean + rand(-spread, spread))),
      );
    }

    await prisma.studentEvaluationScore.create({
      data: { evaluationId: ev.id, studentId: family.studentId, score, status },
    });
    count += 1;
  }
  return count;
}

const HEALTH_CATALOG = {
  julien: {
    conditions: [
      {
        type: "ALLERGY",
        alertLevel: "URGENT",
        label: "Allergie aux fruits de mer",
        description:
          "Allergie alimentaire confirmée par un allergologue. Réaction cutanée et digestive déjà observée après ingestion accidentelle de crevettes.",
        emergencyInstructions:
          "Éviter tout aliment à base de fruits de mer à la cantine. En cas de réaction, prévenir l'infirmerie et les parents immédiatement.",
        isVisibleToAllTeachers: true,
        publicAlertLabel: "Allergie alimentaire — fruits de mer",
        active: true,
        startDate: "2025-09-01T00:00:00.000Z",
      },
    ],
    careEvents: [
      {
        occurredAt: daysAgo(18, 10, 0),
        summary: "Petite coupure à la main pendant la récréation",
        description:
          "Coupure superficielle au doigt en jouant. Nettoyage et pansement, aucune gravité.",
        alertLevel: "INFO",
        followUpNeeded: false,
      },
    ],
    reports: [
      {
        type: "VACCINATION",
        alertLevel: "INFO",
        description:
          "Mise à jour du carnet de vaccination (rappel DTP) effectuée chez le médecin traitant.",
        sportRestriction: false,
        effectiveFrom: daysAgo(10),
      },
    ],
  },
  daniel: {
    conditions: [
      {
        type: "PATHOLOGY",
        alertLevel: "ATTENTION",
        label: "Asthme d'effort",
        description:
          "Asthme d'effort diagnostiqué en 2024, bien contrôlé. Ventoline à disposition pendant l'EPS.",
        emergencyInstructions:
          "La ventoline est dans le sac de sport. En cas de gêne respiratoire persistante, contacter l'infirmerie et les parents.",
        isVisibleToAllTeachers: true,
        publicAlertLabel: "Asthme — ventoline si besoin",
        active: true,
        startDate: "2024-11-10T00:00:00.000Z",
      },
    ],
    careEvents: [
      {
        occurredAt: daysAgo(25, 14, 0),
        summary: "Gêne respiratoire en cours d'EPS",
        description:
          "Légère crise d'asthme pendant l'échauffement. Ventoline administrée, amélioration rapide.",
        alertLevel: "ATTENTION",
        followUpNeeded: true,
      },
    ],
    reports: [
      {
        type: "CONSULTATION",
        alertLevel: "INFO",
        description:
          "Consultation de suivi chez le pneumologue, traitement inchangé.",
        sportRestriction: false,
        effectiveFrom: daysAgo(6),
      },
    ],
  },
  lucie: {
    conditions: [
      {
        type: "TREATMENT",
        alertLevel: "INFO",
        label: "Traitement antihistaminique saisonnier",
        description:
          "Prise quotidienne d'un antihistaminique pendant la saison des pollens pour rhinite allergique.",
        emergencyInstructions: null,
        isVisibleToAllTeachers: false,
        publicAlertLabel: null,
        active: true,
        startDate: daysAgo(15),
        endDate: daysFromNow(75),
      },
    ],
    careEvents: [
      {
        occurredAt: daysAgo(12, 11, 30),
        summary: "Maux de tête à l'infirmerie",
        description:
          "Élève venue à l'infirmerie pour maux de tête, repos 20 minutes, retour en classe après amélioration.",
        alertLevel: "INFO",
        followUpNeeded: false,
      },
    ],
    reports: [
      {
        type: "MALADIE",
        alertLevel: "ATTENTION",
        description:
          "Épisode de grippe saisonnière avec fièvre. Repos à la maison, traitement symptomatique.",
        sportRestriction: true,
        effectiveFrom: daysAgo(30),
        effectiveTo: daysAgo(25),
      },
    ],
  },
  fatou: {
    conditions: [
      {
        type: "INSTRUCTION",
        alertLevel: "INFO",
        label: "Port de lunettes en classe",
        description:
          "Légère myopie détectée, port de lunettes prescrit pour la lecture au tableau.",
        emergencyInstructions: null,
        isVisibleToAllTeachers: false,
        publicAlertLabel: null,
        active: true,
        startDate: daysAgo(20),
      },
    ],
    careEvents: [
      {
        occurredAt: daysAgo(8, 9, 45),
        summary: "Chute dans la cour de récréation",
        description:
          "Éraflure superficielle au genou, nettoyage et pansement à l'infirmerie.",
        alertLevel: "ATTENTION",
        followUpNeeded: false,
      },
    ],
    reports: [
      {
        type: "CONSULTATION",
        alertLevel: "INFO",
        description:
          "Consultation ophtalmologique confirmant une myopie légère, lunettes prescrites.",
        sportRestriction: false,
        effectiveFrom: daysAgo(20),
      },
    ],
  },
  michel: {
    conditions: [
      {
        type: "OTHER",
        alertLevel: "INFO",
        label: "Fracture du poignet droit (consolidée)",
        description:
          "Fracture suite à une chute de vélo pendant les vacances. Immobilisation 5 semaines, rééducation terminée.",
        emergencyInstructions: null,
        isVisibleToAllTeachers: false,
        publicAlertLabel: null,
        active: false,
        startDate: "2025-07-10T00:00:00.000Z",
        endDate: "2025-08-20T00:00:00.000Z",
      },
    ],
    careEvents: [
      {
        occurredAt: daysAgo(14, 13, 15),
        summary: "Douleur abdominale après le déjeuner",
        description:
          "Élève venu à l'infirmerie se plaignant de maux de ventre. Repos 20 minutes, amélioration, retour en cours.",
        alertLevel: "INFO",
        followUpNeeded: false,
      },
    ],
    reports: [
      {
        type: "RESTRICTION_SPORT",
        alertLevel: "ATTENTION",
        description:
          "Suite légère de la fracture au poignet, éviter les sports de contact pendant encore 2 semaines par précaution.",
        sportRestriction: true,
        effectiveFrom: daysAgo(3),
        effectiveTo: daysFromNow(11),
      },
    ],
  },
};

async function seedHealthForStudent(family) {
  const data = HEALTH_CATALOG[family.key];
  let count = 0;

  for (const c of data.conditions) {
    const existing = await prisma.studentHealthCondition.findFirst({
      where: {
        schoolId: SCHOOL_ID,
        studentId: family.studentId,
        label: c.label,
      },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.studentHealthCondition.create({
      data: {
        schoolId: SCHOOL_ID,
        studentId: family.studentId,
        createdByUserId: family.parentUserId,
        ...c,
        startDate:
          typeof c.startDate === "string" ? iso(c.startDate) : c.startDate,
        endDate: c.endDate
          ? typeof c.endDate === "string"
            ? iso(c.endDate)
            : c.endDate
          : null,
      },
    });
    count += 1;
  }

  for (const e of data.careEvents) {
    const existing = await prisma.studentHealthCareEvent.findFirst({
      where: {
        schoolId: SCHOOL_ID,
        studentId: family.studentId,
        summary: e.summary,
      },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.studentHealthCareEvent.create({
      data: {
        schoolId: SCHOOL_ID,
        studentId: family.studentId,
        authorUserId: ADMIN,
        ...e,
      },
    });
    count += 1;
  }

  for (const r of data.reports) {
    const existing = await prisma.studentHealthReport.findFirst({
      where: {
        schoolId: SCHOOL_ID,
        studentId: family.studentId,
        description: r.description,
      },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.studentHealthReport.create({
      data: {
        schoolId: SCHOOL_ID,
        studentId: family.studentId,
        reportedByUserId: family.parentUserId,
        ...r,
      },
    });
    count += 1;
  }

  return count;
}

const DISCIPLINE_CATALOG = {
  julien: [
    {
      type: "RETARD",
      occurredAt: daysAgo(9, 7, 55),
      durationMinutes: 10,
      justified: false,
      reason: "Retard non justifié",
    },
  ],
  daniel: [
    {
      type: "ABSENCE",
      occurredAt: daysAgo(20, 8, 0),
      justified: true,
      reason: "Absence justifiée — rendez-vous médical",
      comment: "Certificat médical transmis au secrétariat.",
    },
  ],
  lucie: [
    {
      type: "PUNITION",
      occurredAt: daysAgo(15, 10, 0),
      reason: "Devoir non fait",
      comment: "Exercices supplémentaires à rendre pour le cours suivant.",
    },
  ],
  fatou: [
    {
      type: "ABSENCE",
      occurredAt: daysAgo(22, 8, 0),
      justified: false,
      reason: "Absence non justifiée",
      comment: "Parents non joignables le jour même.",
    },
  ],
  michel: [
    {
      type: "RETARD",
      occurredAt: daysAgo(6, 7, 50),
      durationMinutes: 15,
      justified: true,
      reason: "Retard — embouteillage transport scolaire",
    },
  ],
};

async function seedDisciplineForStudent(family) {
  const events = DISCIPLINE_CATALOG[family.key];
  const classTeacher = TEACHERS.MATH;
  let count = 0;
  for (const ev of events) {
    const existing = await prisma.studentLifeEvent.findFirst({
      where: {
        schoolId: SCHOOL_ID,
        studentId: family.studentId,
        reason: ev.reason,
      },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.studentLifeEvent.create({
      data: {
        schoolId: SCHOOL_ID,
        studentId: family.studentId,
        classId: family.classId,
        schoolYearId: SCHOOL_YEAR_ID,
        authorUserId: classTeacher,
        comment: null,
        ...ev,
      },
    });
    count += 1;
  }
  return count;
}

async function seedHomeworkActivityForStudent(family, homeworkIdsByClass) {
  let count = 0;
  const classHomework = homeworkIdsByClass[family.classId];
  if (!classHomework || classHomework.length === 0) return 0;

  const hw = classHomework[0];
  const existingCompletion = await prisma.homeworkCompletion.findFirst({
    where: { homeworkId: hw.id, studentId: family.studentId },
    select: { id: true },
  });
  if (!existingCompletion) {
    await prisma.homeworkCompletion.create({
      data: {
        schoolId: SCHOOL_ID,
        homeworkId: hw.id,
        studentId: family.studentId,
        doneAt: daysAgo(4, 18, 30),
      },
    });
    count += 1;
  }

  const existingComment = await prisma.homeworkComment.findFirst({
    where: { homeworkId: hw.id, studentId: family.studentId },
    select: { id: true },
  });
  if (!existingComment) {
    await prisma.homeworkComment.create({
      data: {
        schoolId: SCHOOL_ID,
        homeworkId: hw.id,
        authorUserId: family.parentUserId,
        studentId: family.studentId,
        body: `Bonjour, ${family.studentName.split(" ")[0]} a bien fait le travail demandé, une petite précision serait utile sur la suite.`,
        createdAt: daysAgo(3, 19, 0),
      },
    });
    count += 1;
  }

  return count;
}

async function seedPaymentsForStudent(family, installments) {
  const scenarios = {
    julien: [0, 1], // 2 tranches payées sur 3
    daniel: [0, 1, 2], // tout payé
    lucie: [0], // 1 tranche payée
    fatou: [], // rien payé encore
    michel: [0, 1],
  };
  const paidIndexes = scenarios[family.key] ?? [];
  let count = 0;
  for (const idx of paidIndexes) {
    const inst = installments[idx];
    if (!inst) continue;
    const existing = await prisma.studentPayment.findFirst({
      where: { studentId: family.studentId, note: { contains: inst.label } },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.studentPayment.create({
      data: {
        schoolId: SCHOOL_ID,
        schoolYearId: SCHOOL_YEAR_ID,
        studentId: family.studentId,
        amount: inst.amount,
        source: "DIRECT_CASH",
        recordedByUserId: ADMIN,
        paidAt: daysAgo(30 - idx * 10, 10, 0),
        note: `Paiement ${inst.label} — scolarité 2025-2026`,
      },
    });
    count += 1;
  }
  return count;
}

function attachment(fileName, mimeType, sizeBytes) {
  return { fileName, mimeType, sizeBytes };
}

async function createMessage({
  senderUserId,
  status,
  subject,
  body,
  sentAt,
  recipients,
  attachments,
}) {
  const message = await prisma.internalMessage.create({
    data: {
      schoolId: SCHOOL_ID,
      senderUserId,
      status,
      subject,
      body,
      sentAt: sentAt ? iso(sentAt) : null,
      recipients: recipients?.length
        ? {
            createMany: {
              data: recipients.map((r) => ({
                schoolId: SCHOOL_ID,
                recipientUserId: r.recipientUserId,
                readAt: r.readAt ? iso(r.readAt) : null,
              })),
            },
          }
        : undefined,
    },
    select: { id: true },
  });

  if (attachments?.length) {
    for (const att of attachments) {
      await prisma.internalMessageAttachment.create({
        data: {
          messageId: message.id,
          schoolId: SCHOOL_ID,
          fileName: att.fileName,
          fileUrl: `${MEDIA_BASE}/messages/${message.id}/${att.fileName}`,
          mimeType: att.mimeType,
          sizeBytes: att.sizeBytes,
        },
      });
    }
  }
  return message.id;
}

async function seedMessagingForFamily(family) {
  const firstName = family.studentName.split(" ")[0];
  const teacherOfClass =
    family.classId === CLASS_C ? TEACHERS.GEO : TEACHERS.MATH;
  let count = 0;

  // 1. Reçu — bienvenue de l'administration (lu)
  await createMessage({
    senderUserId: ADMIN,
    status: "SENT",
    subject: `Bienvenue à ${firstName} au Lycée du Poisson d'Avril`,
    body: `<p>Bonjour,</p><p>Nous confirmons l'inscription de ${firstName} en classe de ${family.className} pour l'année scolaire 2025-2026. Bienvenue au sein de notre établissement.</p>`,
    sentAt: daysAgo(28, 9, 0),
    recipients: [
      { recipientUserId: family.parentUserId, readAt: daysAgo(27, 18, 0) },
    ],
  });
  count += 1;

  // 2. Reçu — rappel fournitures de l'enseignant (non lu)
  await createMessage({
    senderUserId: teacherOfClass,
    status: "SENT",
    subject: `Fournitures scolaires pour ${family.className}`,
    body: `<p>Bonjour,</p><p>Merci de vous assurer que ${firstName} dispose de l'ensemble des fournitures demandées pour le début des cours.</p>`,
    sentAt: daysAgo(24, 8, 30),
    recipients: [{ recipientUserId: family.parentUserId }],
  });
  count += 1;

  // 3. Reçu — échéancier de scolarité avec pièce jointe (lu)
  await createMessage({
    senderUserId: ADMIN,
    status: "SENT",
    subject: "Échéancier de scolarité 2025-2026",
    body: "<p>Bonjour,</p><p>Veuillez trouver ci-joint l'échéancier des frais de scolarité pour l'année en cours.</p>",
    sentAt: daysAgo(26, 11, 0),
    recipients: [
      { recipientUserId: family.parentUserId, readAt: daysAgo(25, 20, 0) },
    ],
    attachments: [
      attachment(
        "echeancier_scolarite_2025_2026.pdf",
        "application/pdf",
        184320,
      ),
    ],
  });
  count += 1;

  // 4. Envoyé — question au professeur
  await createMessage({
    senderUserId: family.parentUserId,
    status: "SENT",
    subject: `Question au sujet de l'emploi du temps de ${firstName}`,
    body: `<p>Bonjour,</p><p>Pourriez-vous me confirmer l'horaire exact des cours d'EPS pour ${firstName} ? Merci d'avance.</p>`,
    sentAt: daysAgo(20, 17, 30),
    recipients: [{ recipientUserId: teacherOfClass }],
  });
  count += 1;

  // 5. Envoyé — signalement à l'administration
  await createMessage({
    senderUserId: family.parentUserId,
    status: "SENT",
    subject: "Mise à jour des informations médicales",
    body: `<p>Bonjour,</p><p>Je vous informe d'une information médicale importante concernant ${firstName}, déjà renseignée dans son dossier santé. Merci d'en tenir compte.</p>`,
    sentAt: daysAgo(17, 16, 0),
    recipients: [{ recipientUserId: ADMIN, readAt: daysAgo(16, 9, 0) }],
  });
  count += 1;

  // 6. Reçu — photo/production de classe avec pièce jointe (non lu)
  await createMessage({
    senderUserId: teacherOfClass,
    status: "SENT",
    subject: `Retour sur le travail récent de ${firstName}`,
    body: `<p>Bonjour,</p><p>Vous trouverez ci-joint un retour détaillé sur le travail récent de ${firstName}.</p>`,
    sentAt: daysAgo(6, 15, 0),
    recipients: [{ recipientUserId: family.parentUserId }],
    attachments: [
      attachment("bulletin_sequence_1.pdf", "application/pdf", 96256),
    ],
  });
  count += 1;

  // 7. Brouillon
  await createMessage({
    senderUserId: family.parentUserId,
    status: "DRAFT",
    subject: "Demande de rendez-vous",
    body: `<p>Bonjour, je souhaiterais un rendez-vous pour échanger sur la scolarité de ${firstName}</p>`,
    sentAt: null,
  });
  count += 1;

  return count;
}

// ---------------------------------------------------------------------------

async function main() {
  const tcsCount = await seedTeacherClassSubjectFor6emeA();
  const slotCount = await seedTimetableFor6emeA();
  const evalIdsA = await seedEvaluationsFor6emeA();
  const feedA = await seedFeedFor6emeA();
  const homeworkA = await seedHomeworkFor6emeA();
  const installments = await seedFeeSchedule();

  const homeworkIdsByClass = {
    [CLASS_A]: Object.values(homeworkA).map((id) => ({ id })),
  };
  for (const classId of [CLASS_B, CLASS_C]) {
    const rows = await prisma.homework.findMany({
      where: { classId },
      orderBy: { createdAt: "asc" },
      take: 3,
      select: { id: true },
    });
    homeworkIdsByClass[classId] = rows;
  }

  const evaluationsByClass = {
    [CLASS_A]: Object.values(evalIdsA).map((id) => {
      const def = NEW_EVALUATIONS_A.find(
        (e) => e.key === Object.keys(evalIdsA).find((k) => evalIdsA[k] === id),
      );
      return { id, maxScore: def?.maxScore ?? 20 };
    }),
  };
  for (const classId of [CLASS_B, CLASS_C]) {
    evaluationsByClass[classId] = await prisma.evaluation.findMany({
      where: { classId },
      select: { id: true, maxScore: true },
    });
  }

  const summary = {
    teacherClassSubjectA: tcsCount,
    timetableSlotsA: slotCount,
    evaluationsA: Object.keys(evalIdsA).length,
    feedA,
    homeworkA: Object.keys(homeworkA).length,
    feeInstallments: installments.length,
    perFamily: {},
  };

  for (const family of FAMILIES) {
    const scoreCount = await seedScoresForStudent(
      family,
      evaluationsByClass[family.classId],
    );
    const healthCount = await seedHealthForStudent(family);
    const disciplineCount = await seedDisciplineForStudent(family);
    const homeworkActivity = await seedHomeworkActivityForStudent(
      family,
      homeworkIdsByClass,
    );
    const paymentCount = await seedPaymentsForStudent(family, installments);
    const messageCount = await seedMessagingForFamily(family);

    summary.perFamily[family.key] = {
      scoreCount,
      healthCount,
      disciplineCount,
      homeworkActivity,
      paymentCount,
      messageCount,
    };
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
