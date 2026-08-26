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

const SCHOOL_ID = "cmlsm7wgp0004mu0isxikgdz7"; // Lycée du Poisson d'Avril
const SCHOOL_YEAR_ID = "cmlsm7wgp0003mu0ia1ux88xo"; // 2025-2026
const CLASS_ID = "cmlte87s6001ans0ioihwxbnj"; // 6e B

const STUDENTS = {
  NINA: {
    id: "cmt09u70t0063li0ilztfzkp1",
    userId: "cmt09uncq0066li0igzcels8j",
  },
  MARIE: {
    id: "cmt0adaxj006lli0iytn30rxf",
    userId: "cmt0adv3z006oli0iju7no5bp",
  },
};

const SUBJECTS = {
  MATH: {
    id: "cmrgg204y0003nv4ztupnu35x",
    teacherUserId: "cmlsm7wh80005mu0iz1v7lw3p",
  }, // Emma MBELE
  GEO: {
    id: "cmrgg7k520003nv6t52t5z56q",
    teacherUserId: "cmo62ivo1003cl70i93znwnir",
  }, // Gallice Talla Talla
  HIST_FOTSING: {
    id: "cmrgg7k4q0001nv6tqu33ny62",
    teacherUserId: "cmlten0dq0027ns0il3ohmupv",
  }, // FOTSING
  HIST_DJOUMESSI: {
    id: "cmrgg7k4q0001nv6tqu33ny62",
    teacherUserId: "cmok9jck6003yp90i2v5ndn2m",
  }, // Djoumessi
  ANG: {
    id: "cmrgg2061000fnv4zw5pmnfa6",
    teacherUserId: "cmr31lugw002hrp0juzuf0sr2",
  }, // Anne Marie Leugeu
  ART: {
    id: "cmrgg205o000bnv4zvcsuzcwb",
    teacherUserId: "cmr4sgftj0000mb0j8ygala5e",
  }, // William Tagal
  FR: {
    id: "cmrgg204r0001nv4z9d5psq88",
    teacherUserId: "cms3lot030009qi0ijo65yhi9",
  }, // Viviane Fopa
};

const EVAL_TYPES = {
  COMPOSITION: "cmms79v4r0005ok7uwbesj7jc",
  INTERROGATION: "cmms79v450001ok7u1qpcdn03",
  DEVOIR: "cmms79v4l0003ok7u8i6yrl17",
  ORAL: "cmms79v500009ok7unhqmkq3z",
  TP: "cmms79v4w0007ok7u5thi6ttc",
};

const EMMA_MBELE = "cmlsm7wh80005mu0iz1v7lw3p";
const GALLICE_TALLA = "cmo62ivo1003cl70i93znwnir";
const ANNE_MARIE_LEUGEU = "cmr31lugw002hrp0juzuf0sr2";
const VIVIANE_FOPA = "cms3lot030009qi0ijo65yhi9";
const WILLIAM_TAGAL = "cmr4sgftj0000mb0j8ygala5e";

function iso(dateStr) {
  return new Date(dateStr);
}

// Nouvelles évaluations pour completer la couverture (toutes séquences, tous types,
// toutes les matières enseignées en 6e B). Les évaluations de Maths/Géo existantes
// (SEQ_1,2,4,5,6) sont réutilisées telles quelles.
const NEW_EVALUATIONS = [
  {
    key: "fr_s1",
    subject: SUBJECTS.FR,
    sequence: "SEQ_1",
    type: EVAL_TYPES.DEVOIR,
    title: "Dictée et expression écrite",
    maxScore: 20,
    coefficient: 1,
    date: "2025-10-08T08:00:00Z",
  },
  {
    key: "fr_s3",
    subject: SUBJECTS.FR,
    sequence: "SEQ_3",
    type: EVAL_TYPES.ORAL,
    title: "Récitation – poésie",
    maxScore: 20,
    coefficient: 1,
    date: "2026-01-21T08:00:00Z",
  },
  {
    key: "fr_s5",
    subject: SUBJECTS.FR,
    sequence: "SEQ_5",
    type: EVAL_TYPES.COMPOSITION,
    title: "Composition de Français",
    maxScore: 20,
    coefficient: 2,
    date: "2026-05-19T08:00:00Z",
  },
  {
    key: "ang_s2",
    subject: SUBJECTS.ANG,
    sequence: "SEQ_2",
    type: EVAL_TYPES.ORAL,
    title: "Oral – dialogue en anglais",
    maxScore: 20,
    coefficient: 1,
    date: "2025-11-26T08:00:00Z",
  },
  {
    key: "ang_s3",
    subject: SUBJECTS.ANG,
    sequence: "SEQ_3",
    type: EVAL_TYPES.DEVOIR,
    title: "Devoir Anglais – grammar",
    maxScore: 20,
    coefficient: 1,
    date: "2026-01-26T08:00:00Z",
  },
  {
    key: "ang_s6",
    subject: SUBJECTS.ANG,
    sequence: "SEQ_6",
    type: EVAL_TYPES.COMPOSITION,
    title: "Composition d'Anglais",
    maxScore: 20,
    coefficient: 2,
    date: "2026-06-24T08:00:00Z",
  },
  {
    key: "hist_s1",
    subject: SUBJECTS.HIST_FOTSING,
    sequence: "SEQ_1",
    type: EVAL_TYPES.DEVOIR,
    title: "La préhistoire",
    maxScore: 20,
    coefficient: 1,
    date: "2025-10-10T08:00:00Z",
  },
  {
    key: "hist_s3",
    subject: SUBJECTS.HIST_DJOUMESSI,
    sequence: "SEQ_3",
    type: EVAL_TYPES.INTERROGATION,
    title: "Interrogation – Antiquité",
    maxScore: 10,
    coefficient: 0.5,
    date: "2026-01-23T08:00:00Z",
  },
  {
    key: "hist_s5",
    subject: SUBJECTS.HIST_FOTSING,
    sequence: "SEQ_5",
    type: EVAL_TYPES.COMPOSITION,
    title: "Composition d'Histoire",
    maxScore: 20,
    coefficient: 2,
    date: "2026-05-26T08:00:00Z",
  },
  {
    key: "geo_s3",
    subject: SUBJECTS.GEO,
    sequence: "SEQ_3",
    type: EVAL_TYPES.TP,
    title: "Exposé – Le relief camerounais",
    maxScore: 20,
    coefficient: 1.5,
    date: "2026-01-28T08:00:00Z",
  },
  {
    key: "geo_s4",
    subject: SUBJECTS.GEO,
    sequence: "SEQ_4",
    type: EVAL_TYPES.INTERROGATION,
    title: "Interrogation – Climats",
    maxScore: 10,
    coefficient: 0.5,
    date: "2026-03-11T08:00:00Z",
  },
  {
    key: "geo_s6",
    subject: SUBJECTS.GEO,
    sequence: "SEQ_6",
    type: EVAL_TYPES.COMPOSITION,
    title: "Composition de Géographie",
    maxScore: 20,
    coefficient: 2,
    date: "2026-06-25T08:00:00Z",
  },
  {
    key: "art_s2",
    subject: SUBJECTS.ART,
    sequence: "SEQ_2",
    type: EVAL_TYPES.TP,
    title: "Projet créatif – collage",
    maxScore: 20,
    coefficient: 1,
    date: "2025-11-28T08:00:00Z",
  },
  {
    key: "art_s4",
    subject: SUBJECTS.ART,
    sequence: "SEQ_4",
    type: EVAL_TYPES.ORAL,
    title: "Présentation d'une œuvre",
    maxScore: 20,
    coefficient: 1,
    date: "2026-03-13T08:00:00Z",
  },
  {
    key: "art_s6",
    subject: SUBJECTS.ART,
    sequence: "SEQ_6",
    type: EVAL_TYPES.DEVOIR,
    title: "Devoir pratique – dessin",
    maxScore: 20,
    coefficient: 1,
    date: "2026-06-26T08:00:00Z",
  },
  {
    key: "math_s3",
    subject: SUBJECTS.MATH,
    sequence: "SEQ_3",
    type: EVAL_TYPES.INTERROGATION,
    title: "Interrogation Maths S3",
    maxScore: 10,
    coefficient: 0.5,
    date: "2026-01-20T08:00:00Z",
  },
];

// Scores par élève et par clé d'évaluation (clé = evaluation.id existant ou
// NEW_EVALUATIONS[].key). "status" par défaut ENTERED sauf indication.
const NINA_SCORES = {
  cmqzti9m9005oms0ier7ouowq: 15, // Géo SEQ1
  vpa_s2_6B_ma1: 14,
  vpa_s2_6B_ma3: 15.5,
  vpa_s2_6B_ma2: 8,
  vpa_s4_6B_ma1: 13,
  vpa_s4_6B_ma2: 16,
  vpa_s4_6B_ma3: 14.5,
  "79c54c3f-4cb9-4a89-bd77-a124f291a0e6": 15,
  "f122e219-d8ad-41f9-a840-07e802055228": 16,
  "68747b87-77c0-4f02-aecd-9c97ee1173ef": null, // absente
  "7c24aae1-5b88-4a97-bc98-e278a31e6e88": 14,
  vpa_s6_6B_ma1: 15,
  vpa_s6_6B_ma3: 16.5,
  vpa_s6_6B_ma2: 9,
  fr_s1: 16,
  fr_s3: 17,
  fr_s5: 15.5,
  ang_s2: 14,
  ang_s3: 13,
  ang_s6: 15,
  hist_s1: 13.5,
  hist_s3: 7,
  hist_s5: 14,
  geo_s3: 16,
  geo_s4: 8.5,
  geo_s6: 15,
  art_s2: 17,
  art_s4: 16,
  art_s6: 18,
  math_s3: 8,
};
const NINA_STATUS_OVERRIDES = {
  "68747b87-77c0-4f02-aecd-9c97ee1173ef": "ABSENT",
};

const MARIE_SCORES = {
  cmqzti9m9005oms0ier7ouowq: 12,
  vpa_s2_6B_ma1: 9,
  vpa_s2_6B_ma3: 10.5,
  vpa_s2_6B_ma2: 5,
  vpa_s4_6B_ma1: 8,
  vpa_s4_6B_ma2: null, // non notée
  vpa_s4_6B_ma3: 9.5,
  "79c54c3f-4cb9-4a89-bd77-a124f291a0e6": 10,
  "f122e219-d8ad-41f9-a840-07e802055228": 11,
  "68747b87-77c0-4f02-aecd-9c97ee1173ef": 9,
  "7c24aae1-5b88-4a97-bc98-e278a31e6e88": 10.5,
  vpa_s6_6B_ma1: 9,
  vpa_s6_6B_ma3: 11,
  vpa_s6_6B_ma2: 4.5,
  fr_s1: 15,
  fr_s3: 16,
  fr_s5: 14.5,
  ang_s2: 13,
  ang_s3: 12,
  ang_s6: 13.5,
  hist_s1: 12,
  hist_s3: null, // absente
  hist_s5: 13,
  geo_s3: 15,
  geo_s4: 9,
  geo_s6: 14,
  art_s2: 16,
  art_s4: 15,
  art_s6: 17,
  math_s3: 6,
};
const MARIE_STATUS_OVERRIDES = {
  vpa_s4_6B_ma2: "NOT_GRADED",
  hist_s3: "EXCUSED",
};

function scoreStatus(overrides, key, score) {
  if (overrides[key]) return overrides[key];
  return score === null ? "NOT_GRADED" : "ENTERED";
}

async function seedEvaluations() {
  const createdEvalIdByKey = {};
  for (const evalDef of NEW_EVALUATIONS) {
    const created = await prisma.evaluation.create({
      data: {
        schoolId: SCHOOL_ID,
        schoolYearId: SCHOOL_YEAR_ID,
        classId: CLASS_ID,
        subjectId: evalDef.subject.id,
        evaluationTypeId: evalDef.type,
        authorUserId: evalDef.subject.teacherUserId,
        title: evalDef.title,
        coefficient: evalDef.coefficient,
        maxScore: evalDef.maxScore,
        sequence: evalDef.sequence,
        status: "PUBLISHED",
        scheduledAt: iso(evalDef.date),
        publishedAt: iso(evalDef.date),
      },
      select: { id: true },
    });
    createdEvalIdByKey[evalDef.key] = created.id;
  }
  return createdEvalIdByKey;
}

async function seedScoresForStudent(
  studentId,
  scores,
  overrides,
  createdEvalIdByKey,
) {
  let count = 0;
  for (const [key, score] of Object.entries(scores)) {
    const evaluationId = createdEvalIdByKey[key] ?? key;
    await prisma.studentEvaluationScore.create({
      data: {
        evaluationId,
        studentId,
        score,
        status: scoreStatus(overrides, key, score),
      },
    });
    count += 1;
  }
  return count;
}

async function seedDiscipline() {
  const events = [
    {
      studentId: STUDENTS.NINA.id,
      type: "ABSENCE",
      occurredAt: "2025-11-05T08:00:00Z",
      justified: true,
      reason: "Absence justifiée – rendez-vous médical",
      comment: "Certificat médical transmis au secrétariat.",
      authorUserId: EMMA_MBELE,
    },
    {
      studentId: STUDENTS.NINA.id,
      type: "RETARD",
      occurredAt: "2026-02-03T07:50:00Z",
      durationMinutes: 10,
      justified: false,
      reason: "Retard non justifié",
      comment: null,
      authorUserId: EMMA_MBELE,
    },
    {
      studentId: STUDENTS.NINA.id,
      type: "PUNITION",
      occurredAt: "2026-04-14T10:00:00Z",
      reason: "Devoir de mathématiques non fait",
      comment: "Exercices supplémentaires à rendre pour le cours suivant.",
      authorUserId: EMMA_MBELE,
    },
    {
      studentId: STUDENTS.NINA.id,
      type: "SANCTION",
      occurredAt: "2026-06-09T09:00:00Z",
      reason: "Bavardage répété malgré avertissements",
      comment: "Avertissement inscrit au carnet, parents informés.",
      authorUserId: GALLICE_TALLA,
    },
    {
      studentId: STUDENTS.MARIE.id,
      type: "ABSENCE",
      occurredAt: "2025-12-15T08:00:00Z",
      justified: false,
      reason: "Absence non justifiée",
      comment: "Parents non joignables le jour même.",
      authorUserId: GALLICE_TALLA,
    },
    {
      studentId: STUDENTS.MARIE.id,
      type: "RETARD",
      occurredAt: "2026-03-17T07:55:00Z",
      durationMinutes: 8,
      justified: true,
      reason: "Retard – embouteillage transport scolaire",
      comment: null,
      authorUserId: GALLICE_TALLA,
    },
    {
      studentId: STUDENTS.MARIE.id,
      type: "PUNITION",
      occurredAt: "2026-05-06T10:00:00Z",
      reason: "Oubli répété du matériel",
      comment: "Copie de 20 lignes à rendre.",
      authorUserId: EMMA_MBELE,
    },
    {
      studentId: STUDENTS.MARIE.id,
      type: "SANCTION",
      occurredAt: "2026-06-16T09:00:00Z",
      reason: "Chahut pendant l'évaluation",
      comment: "Convocation des parents, sanction inscrite au dossier.",
      authorUserId: GALLICE_TALLA,
    },
  ];

  for (const event of events) {
    await prisma.studentLifeEvent.create({
      data: {
        schoolId: SCHOOL_ID,
        studentId: event.studentId,
        classId: CLASS_ID,
        schoolYearId: SCHOOL_YEAR_ID,
        authorUserId: event.authorUserId,
        type: event.type,
        occurredAt: iso(event.occurredAt),
        durationMinutes: event.durationMinutes,
        justified: event.justified,
        reason: event.reason,
        comment: event.comment,
      },
    });
  }
  return events.length;
}

async function seedHomework() {
  const mathHomework = await prisma.homework.create({
    data: {
      schoolId: SCHOOL_ID,
      schoolYearId: SCHOOL_YEAR_ID,
      classId: CLASS_ID,
      subjectId: SUBJECTS.MATH.id,
      authorUserId: EMMA_MBELE,
      title: "Réviser les fractions et la proportionnalité",
      contentHtml:
        "<p>Revoir les exercices 1 à 5 page 42 en vue de la composition de rentrée.</p>",
      expectedAt: iso("2026-08-31T07:00:00Z"),
    },
    select: { id: true },
  });

  const angHomework = await prisma.homework.create({
    data: {
      schoolId: SCHOOL_ID,
      schoolYearId: SCHOOL_YEAR_ID,
      classId: CLASS_ID,
      subjectId: SUBJECTS.ANG.id,
      authorUserId: ANNE_MARIE_LEUGEU,
      title: "Learn vocabulary list – Unit 5",
      contentHtml:
        "<p>Apprendre la liste de vocabulaire de l'unité 5 pour le prochain contrôle oral.</p>",
      expectedAt: iso("2026-08-26T07:00:00Z"),
    },
    select: { id: true },
  });

  const geoHomework = await prisma.homework.findFirst({
    where: {
      classId: CLASS_ID,
      subjectId: SUBJECTS.GEO.id,
      title: "Provinces et les cours d'eau",
    },
    select: { id: true },
  });

  await prisma.homeworkCompletion.create({
    data: {
      schoolId: SCHOOL_ID,
      homeworkId: geoHomework.id,
      studentId: STUDENTS.NINA.id,
      doneAt: iso("2026-08-19T18:30:00Z"),
    },
  });

  await prisma.homeworkComment.create({
    data: {
      schoolId: SCHOOL_ID,
      homeworkId: mathHomework.id,
      authorUserId: STUDENTS.MARIE.userId,
      studentId: STUDENTS.MARIE.id,
      body: "Je n'ai pas bien compris l'exercice 3, pouvez-vous ré-expliquer la méthode ?",
      createdAt: iso("2026-08-21T09:00:00Z"),
    },
  });

  await prisma.homeworkComment.create({
    data: {
      schoolId: SCHOOL_ID,
      homeworkId: mathHomework.id,
      authorUserId: EMMA_MBELE,
      studentId: STUDENTS.MARIE.id,
      body: "Pas de souci Marie, on reprend la méthode ensemble en début de cours.",
      createdAt: iso("2026-08-21T10:15:00Z"),
    },
  });

  return {
    mathHomework: mathHomework.id,
    angHomework: angHomework.id,
    geoHomework: geoHomework.id,
  };
}

async function createMessage({
  senderUserId,
  status,
  subject,
  body,
  sentAt,
  recipients,
}) {
  return prisma.internalMessage.create({
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
}

async function seedMessaging() {
  let count = 0;

  // Nina — inbox non lu
  await createMessage({
    senderUserId: EMMA_MBELE,
    status: "SENT",
    subject: "Bienvenue sur ton espace élève",
    body: "<p>Bonjour Nina,</p><p>Ton espace élève est maintenant actif : tu peux y consulter tes notes, tes devoirs et échanger avec tes professeurs. N'hésite pas si tu as des questions.</p>",
    sentAt: "2026-08-15T09:00:00Z",
    recipients: [{ recipientUserId: STUDENTS.NINA.userId }],
  });
  count += 1;

  // Nina — inbox lu
  await createMessage({
    senderUserId: GALLICE_TALLA,
    status: "SENT",
    subject: "Résultat de ta composition de Géographie",
    body: "<p>Bonjour Nina,</p><p>Bravo pour ta composition de géographie, continue ainsi pour la prochaine séquence.</p>",
    sentAt: "2026-06-26T08:00:00Z",
    recipients: [
      { recipientUserId: STUDENTS.NINA.userId, readAt: "2026-06-27T18:00:00Z" },
    ],
  });
  count += 1;

  // Nina — envoyé
  await createMessage({
    senderUserId: STUDENTS.NINA.userId,
    status: "SENT",
    subject: "Question sur le devoir de mathématiques",
    body: "<p>Bonjour Madame MBELE,</p><p>Je voudrais savoir si le devoir sur les fractions doit être rendu sur feuille double ou dans le cahier.</p>",
    sentAt: "2026-08-20T17:00:00Z",
    recipients: [{ recipientUserId: EMMA_MBELE }],
  });
  count += 1;

  // Nina — brouillon
  await createMessage({
    senderUserId: STUDENTS.NINA.userId,
    status: "DRAFT",
    subject: "Demande de rendez-vous",
    body: "<p>Bonjour, je souhaiterais avoir un rendez-vous pour discuter de</p>",
    sentAt: null,
  });
  count += 1;

  // Marie — inbox non lu
  await createMessage({
    senderUserId: WILLIAM_TAGAL,
    status: "SENT",
    subject: "Rappel : matériel pour le cours d'arts plastiques",
    body: "<p>Bonjour Marie,</p><p>Pense à apporter ta boîte de gouache et un pinceau fin pour le prochain cours.</p>",
    sentAt: "2026-08-19T09:00:00Z",
    recipients: [{ recipientUserId: STUDENTS.MARIE.userId }],
  });
  count += 1;

  // Marie — inbox lu
  await createMessage({
    senderUserId: VIVIANE_FOPA,
    status: "SENT",
    subject: "Encouragements pour ta prochaine composition de Français",
    body: "<p>Bonjour Marie,</p><p>Tes efforts en expression écrite sont visibles, continue les révisions avant la composition.</p>",
    sentAt: "2026-05-20T08:00:00Z",
    recipients: [
      {
        recipientUserId: STUDENTS.MARIE.userId,
        readAt: "2026-05-21T19:00:00Z",
      },
    ],
  });
  count += 1;

  // Marie — envoyé
  await createMessage({
    senderUserId: STUDENTS.MARIE.userId,
    status: "SENT",
    subject: "Absence justifiée – 15 décembre",
    body: "<p>Bonjour,</p><p>Je vous confirme que mon absence du 15 décembre était due à un empêchement familial, mes parents doivent encore transmettre le mot d'excuse.</p>",
    sentAt: "2026-08-18T16:00:00Z",
    recipients: [{ recipientUserId: EMMA_MBELE }],
  });
  count += 1;

  // Marie — brouillon
  await createMessage({
    senderUserId: STUDENTS.MARIE.userId,
    status: "DRAFT",
    subject: "Question sur le devoir d'anglais",
    body: "<p>Bonjour Madame Leugeu, est-ce que la liste de vocabulaire</p>",
    sentAt: null,
  });
  count += 1;

  return count;
}

async function main() {
  const createdEvalIdByKey = await seedEvaluations();

  const ninaScoreCount = await seedScoresForStudent(
    STUDENTS.NINA.id,
    NINA_SCORES,
    NINA_STATUS_OVERRIDES,
    createdEvalIdByKey,
  );
  const marieScoreCount = await seedScoresForStudent(
    STUDENTS.MARIE.id,
    MARIE_SCORES,
    MARIE_STATUS_OVERRIDES,
    createdEvalIdByKey,
  );

  const disciplineCount = await seedDiscipline();
  const homework = await seedHomework();
  const messageCount = await seedMessaging();

  console.log(
    JSON.stringify(
      {
        newEvaluations: Object.keys(createdEvalIdByKey).length,
        ninaScoreCount,
        marieScoreCount,
        disciplineCount,
        homework,
        messageCount,
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
