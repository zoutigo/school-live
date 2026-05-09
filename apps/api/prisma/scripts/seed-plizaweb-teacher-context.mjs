import {
  EvaluationScoreStatus,
  EvaluationStatus,
  FeedAudienceScope,
  FeedPostType,
  PrismaClient,
  StudentLifeEventType,
  Term,
} from "@prisma/client";
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

const SCHOOL_SLUG = "college-vogt";
const TEST_TEACHER_EMAIL = "plizaweb@gmail.com";
const PRIMARY_CLASS_NAME = "6eC";
const SECONDARY_CLASS_NAME = "6eB";

const COLOR_BY_SUBJECT = {
  Anglais: "#2563eb",
  Chimie: "#f97316",
  Géographie: "#16a34a",
  Physique: "#8b5cf6",
  Technologie: "#e11d48",
};

const NEW_STUDENTS_6EB = [
  { firstName: "Esther", lastName: "Ndzi" },
  { firstName: "Kevin", lastName: "Fouda" },
];

const TIMETABLE_TEMPLATE_6EB = [
  {
    weekday: 1,
    startMinute: 810,
    endMinute: 865,
    subject: "Anglais",
    room: "C12",
  },
  {
    weekday: 1,
    startMinute: 870,
    endMinute: 925,
    subject: "Géographie",
    room: "B05",
  },
  {
    weekday: 1,
    startMinute: 935,
    endMinute: 990,
    subject: "Chimie",
    room: "LAB1",
  },
  {
    weekday: 1,
    startMinute: 995,
    endMinute: 1050,
    subject: "Technologie",
    room: "ATELIER",
  },
  {
    weekday: 2,
    startMinute: 810,
    endMinute: 865,
    subject: "Physique",
    room: "LAB2",
  },
  {
    weekday: 2,
    startMinute: 870,
    endMinute: 925,
    subject: "Anglais",
    room: "C12",
  },
  {
    weekday: 2,
    startMinute: 935,
    endMinute: 990,
    subject: "Géographie",
    room: "B05",
  },
  {
    weekday: 2,
    startMinute: 995,
    endMinute: 1050,
    subject: "Chimie",
    room: "LAB1",
  },
  {
    weekday: 3,
    startMinute: 810,
    endMinute: 865,
    subject: "Anglais",
    room: "C12",
  },
  {
    weekday: 3,
    startMinute: 870,
    endMinute: 925,
    subject: "Physique",
    room: "LAB2",
  },
  {
    weekday: 3,
    startMinute: 935,
    endMinute: 990,
    subject: "Technologie",
    room: "ATELIER",
  },
  {
    weekday: 3,
    startMinute: 995,
    endMinute: 1050,
    subject: "Géographie",
    room: "B05",
  },
  {
    weekday: 4,
    startMinute: 810,
    endMinute: 865,
    subject: "Chimie",
    room: "LAB1",
  },
  {
    weekday: 4,
    startMinute: 870,
    endMinute: 925,
    subject: "Anglais",
    room: "C12",
  },
  {
    weekday: 4,
    startMinute: 935,
    endMinute: 990,
    subject: "Géographie",
    room: "B05",
  },
  {
    weekday: 4,
    startMinute: 995,
    endMinute: 1050,
    subject: "Physique",
    room: "LAB2",
  },
  {
    weekday: 5,
    startMinute: 810,
    endMinute: 865,
    subject: "Technologie",
    room: "ATELIER",
  },
  {
    weekday: 5,
    startMinute: 870,
    endMinute: 925,
    subject: "Chimie",
    room: "LAB1",
  },
  {
    weekday: 5,
    startMinute: 935,
    endMinute: 990,
    subject: "Anglais",
    room: "C12",
  },
  {
    weekday: 5,
    startMinute: 995,
    endMinute: 1050,
    subject: "Géographie",
    room: "B05",
  },
];

const EVALUATIONS_6EC = [
  {
    title: "[DEMO PLZ] Lecture de carte et relief",
    description:
      "Evaluation de geographie sur les reperes, l'orientation et la lecture de carte.",
    subjectName: "Géographie",
    branchName: "Relief",
    typeCode: "DEVOIR",
    term: Term.TERM_2,
    maxScore: 20,
    coefficient: 1.5,
    scheduledAt: "2026-02-19T09:00:00.000Z",
    publishedAt: "2026-02-20T14:30:00.000Z",
    status: EvaluationStatus.PUBLISHED,
    scores: {
      "Lisa MBELE": {
        score: 16.5,
        comment: "Carte propre et reperes bien identifies.",
      },
      "Remi Ntamack": {
        score: 12,
        comment: "Bonne comprehension generale, precision a renforcer.",
      },
    },
  },
  {
    title: "[DEMO PLZ] Populations et densites",
    description:
      "Questions de cours et courte analyse d'un document statistique sur les populations.",
    subjectName: "Géographie",
    branchName: "Population",
    typeCode: "INTERROGATION",
    term: Term.TERM_2,
    maxScore: 20,
    coefficient: 1,
    scheduledAt: "2026-03-18T08:15:00.000Z",
    publishedAt: "2026-03-18T16:10:00.000Z",
    status: EvaluationStatus.PUBLISHED,
    scores: {
      "Lisa MBELE": {
        score: 14,
        comment: "Travail serieux, bien relire les definitions.",
      },
      "Remi Ntamack": {
        score: 10.5,
        comment: "Bases acquises, attention aux applications.",
      },
    },
  },
  {
    title: "[DEMO PLZ] Croquis de synthese",
    description:
      "Evaluation a venir sur la realisation d'un croquis simple et sa legende organisee.",
    subjectName: "Géographie",
    branchName: "Relief",
    typeCode: "ORAL",
    term: Term.TERM_2,
    maxScore: 20,
    coefficient: 2,
    scheduledAt: "2026-05-08T08:30:00.000Z",
    publishedAt: null,
    status: EvaluationStatus.DRAFT,
    scores: {
      "Lisa MBELE": {
        status: EvaluationScoreStatus.NOT_GRADED,
        comment: "Evaluation programmee.",
      },
      "Remi Ntamack": {
        status: EvaluationScoreStatus.NOT_GRADED,
        comment: "Evaluation programmee.",
      },
    },
  },
];

const EVALUATIONS_6EB = [
  {
    title: "[DEMO PLZ] Vocabulaire des lieux du college",
    description:
      "Evaluation d'anglais sur le lexique de l'ecole et les consignes simples en classe.",
    subjectName: "Anglais",
    branchName: "Grammaire",
    typeCode: "DEVOIR",
    term: Term.TERM_2,
    maxScore: 20,
    coefficient: 1,
    scheduledAt: "2026-02-11T13:30:00.000Z",
    publishedAt: "2026-02-12T16:00:00.000Z",
    status: EvaluationStatus.PUBLISHED,
    scores: {
      "Paul MBELE": {
        score: 11.5,
        comment: "Le vocabulaire est acquis, revoir l'orthographe.",
      },
      "Esther Ndzi": { score: 16, comment: "Ensemble solide et soigne." },
      "Kevin Fouda": {
        score: 9.5,
        comment: "Des efforts visibles, bases a consolider.",
      },
    },
  },
  {
    title: "[DEMO PLZ] Dialogue et comprehension orale",
    description:
      "Petite evaluation orale d'anglais sur les salutations, questions courtes et reformulation.",
    subjectName: "Anglais",
    branchName: "Expression ecrite",
    typeCode: "ORAL",
    term: Term.TERM_2,
    maxScore: 20,
    coefficient: 1.5,
    scheduledAt: "2026-03-04T14:30:00.000Z",
    publishedAt: "2026-03-05T10:20:00.000Z",
    status: EvaluationStatus.PUBLISHED,
    scores: {
      "Paul MBELE": {
        score: 13,
        comment: "Bonne restitution, gagner en fluidite.",
      },
      "Esther Ndzi": { score: 17.5, comment: "Tres bonne aisance a l'oral." },
      "Kevin Fouda": {
        score: 12,
        comment: "Prononciation correcte, participation encourageante.",
      },
    },
  },
  {
    title: "[DEMO PLZ] Writing checkpoint",
    description:
      "Production ecrite courte en anglais autour d'une presentation personnelle.",
    subjectName: "Anglais",
    branchName: "Expression ecrite",
    typeCode: "COMPOSITION",
    term: Term.TERM_2,
    maxScore: 20,
    coefficient: 2,
    scheduledAt: "2026-04-09T13:30:00.000Z",
    publishedAt: "2026-04-10T09:45:00.000Z",
    status: EvaluationStatus.PUBLISHED,
    scores: {
      "Paul MBELE": {
        score: 12.5,
        comment: "Contenu correct, syntaxe a affermir.",
      },
      "Esther Ndzi": {
        score: 18,
        comment: "Tres bonne structuration et peu d'erreurs.",
      },
      "Kevin Fouda": {
        score: 10,
        comment: "L'idee est la, poursuivre le travail personnel.",
      },
    },
  },
  {
    title: "[DEMO PLZ] Speaking routine de fin de sequence",
    description:
      "Passage oral individuel prevu la semaine prochaine sur la routine quotidienne.",
    subjectName: "Anglais",
    branchName: "Grammaire",
    typeCode: "INTERROGATION",
    term: Term.TERM_2,
    maxScore: 20,
    coefficient: 1,
    scheduledAt: "2026-05-07T14:30:00.000Z",
    publishedAt: null,
    status: EvaluationStatus.DRAFT,
    scores: {
      "Paul MBELE": {
        status: EvaluationScoreStatus.NOT_GRADED,
        comment: "Passage a preparer.",
      },
      "Esther Ndzi": {
        status: EvaluationScoreStatus.NOT_GRADED,
        comment: "Passage a preparer.",
      },
      "Kevin Fouda": {
        status: EvaluationScoreStatus.NOT_GRADED,
        comment: "Passage a preparer.",
      },
    },
  },
];

const LIFE_EVENTS_6EC = [
  {
    studentName: "Lisa MBELE",
    authorEmail: TEST_TEACHER_EMAIL,
    type: StudentLifeEventType.RETARD,
    occurredAt: "2026-04-22T06:10:00.000Z",
    durationMinutes: 12,
    justified: false,
    reason: "Arrivee tardive apres la sonnerie",
    comment: "Carnet signe demande pour demain.",
  },
  {
    studentName: "Remi Ntamack",
    authorEmail: TEST_TEACHER_EMAIL,
    type: StudentLifeEventType.PUNITION,
    occurredAt: "2026-03-27T10:20:00.000Z",
    durationMinutes: null,
    justified: null,
    reason: "Exercice non rendu malgre deux rappels",
    comment: "Travail supplementaire a remettre lundi.",
  },
];

const LIFE_EVENTS_6EB = [
  {
    studentName: "Paul MBELE",
    authorEmail: "teacher-237610101040-65660ba5@noemail.scolive.local",
    type: StudentLifeEventType.RETARD,
    occurredAt: "2026-04-28T12:40:00.000Z",
    durationMinutes: 18,
    justified: false,
    reason: "Entree en cours apres le debut de seance",
    comment: "Rappel de ponctualite transmis a la famille.",
  },
  {
    studentName: "Esther Ndzi",
    authorEmail: TEST_TEACHER_EMAIL,
    type: StudentLifeEventType.ABSENCE,
    occurredAt: "2026-04-24T12:30:00.000Z",
    durationMinutes: 110,
    justified: true,
    reason: "Absence sur l'apres-midi pour rendez-vous medical",
    comment: "Justificatif annonce par la famille.",
  },
  {
    studentName: "Kevin Fouda",
    authorEmail: "teacher-237610101034-28ea2cf3@noemail.scolive.local",
    type: StudentLifeEventType.SANCTION,
    occurredAt: "2026-04-18T14:50:00.000Z",
    durationMinutes: null,
    justified: null,
    reason: "Bousculade repetee a la sortie d'atelier",
    comment: "Excuses demandees et surveillance renforcee.",
  },
  {
    studentName: "Paul MBELE",
    authorEmail: TEST_TEACHER_EMAIL,
    type: StudentLifeEventType.PUNITION,
    occurredAt: "2026-04-16T13:55:00.000Z",
    durationMinutes: null,
    justified: null,
    reason: "Consignes de travail non respectees en anglais",
    comment: "Copie du vocabulaire a refaire proprement.",
  },
  {
    studentName: "Esther Ndzi",
    authorEmail: "teacher-237610101040-65660ba5@noemail.scolive.local",
    type: StudentLifeEventType.RETARD,
    occurredAt: "2026-04-11T12:35:00.000Z",
    durationMinutes: 7,
    justified: true,
    reason: "Retour tardif apres l'infirmerie",
    comment: "Information confirmee par la vie scolaire.",
  },
  {
    studentName: "Kevin Fouda",
    authorEmail: TEST_TEACHER_EMAIL,
    type: StudentLifeEventType.ABSENCE,
    occurredAt: "2026-04-03T12:30:00.000Z",
    durationMinutes: 55,
    justified: false,
    reason: "Absence au premier cours de l'apres-midi",
    comment: "Appel famille demande.",
  },
];

const FEED_POSTS = [
  {
    className: PRIMARY_CLASS_NAME,
    authorEmail: TEST_TEACHER_EMAIL,
    type: FeedPostType.POST,
    title: "[DEMO PLZ] Reperes geographiques a revoir",
    bodyHtml:
      "<p>Les eleves de 6eC poursuivent le travail sur les reperes et la lecture de carte.</p><p>Merci de faire reprendre a la maison la fiche methode distribuee ce matin.</p><!-- PLZ_FEED_6EC_1 -->",
  },
  {
    className: SECONDARY_CLASS_NAME,
    authorEmail: TEST_TEACHER_EMAIL,
    type: FeedPostType.POST,
    title: "[DEMO PLZ] Cahier d'anglais et lecon 5",
    bodyHtml:
      "<p>Pour la prochaine seance d'anglais, chaque eleve doit venir avec le cahier complete et la lecon 5 apprise.</p><p>Une breve verification sera faite en debut d'heure.</p><!-- PLZ_FEED_6EB_1 -->",
  },
  {
    className: SECONDARY_CLASS_NAME,
    authorEmail: "teacher-237610101040-65660ba5@noemail.scolive.local",
    type: FeedPostType.POST,
    title: "[DEMO PLZ] Point de vie de classe",
    bodyHtml:
      "<p>La 6eB montre une meilleure implication depuis quinze jours.</p><p>Les efforts attendus portent surtout sur la ponctualite et le rangement en fin de cours.</p><!-- PLZ_FEED_6EB_2 -->",
  },
  {
    className: SECONDARY_CLASS_NAME,
    authorEmail: TEST_TEACHER_EMAIL,
    type: FeedPostType.POLL,
    title: "[DEMO PLZ] Choix du prochain mini expose",
    bodyHtml:
      "<p>Merci de voter pour le theme du prochain mini expose en anglais.</p><!-- PLZ_FEED_6EB_3 -->",
    pollQuestion:
      "Quel theme vous motive le plus pour la prochaine prise de parole ?",
    pollOptionsJson: [
      { id: "plz-opt-1", label: "My school day", votes: 2 },
      { id: "plz-opt-2", label: "My family", votes: 1 },
      { id: "plz-opt-3", label: "My favourite sport", votes: 0 },
    ],
  },
];

const FEED_COMMENTS = [
  {
    postTitle: "[DEMO PLZ] Cahier d'anglais et lecon 5",
    authorEmail: "teacher-237610101040-65660ba5@noemail.scolive.local",
    text: "Merci, je relaie aussi l'information a l'etude de ce soir.",
  },
  {
    postTitle: "[DEMO PLZ] Point de vie de classe",
    authorEmail: TEST_TEACHER_EMAIL,
    text: "La progression est visible, surtout pendant les activites en groupes.",
  },
];

function keyForStudent(student) {
  return `${student.firstName} ${student.lastName}`;
}

async function ensureStudentForClass({
  schoolId,
  schoolYearId,
  classId,
  firstName,
  lastName,
}) {
  let student = await prisma.student.findFirst({
    where: { schoolId, firstName, lastName },
  });

  if (!student) {
    student = await prisma.student.create({
      data: { schoolId, firstName, lastName },
    });
  }

  await prisma.enrollment.upsert({
    where: {
      schoolYearId_studentId: {
        schoolYearId,
        studentId: student.id,
      },
    },
    update: {
      classId,
      status: "ACTIVE",
    },
    create: {
      schoolId,
      schoolYearId,
      studentId: student.id,
      classId,
      status: "ACTIVE",
    },
  });

  return student;
}

async function ensureTeachingAssignment({
  schoolId,
  schoolYearId,
  classId,
  subjectId,
  teacherUserId,
}) {
  return prisma.teacherClassSubject.upsert({
    where: {
      schoolYearId_teacherUserId_classId_subjectId: {
        schoolYearId,
        teacherUserId,
        classId,
        subjectId,
      },
    },
    update: {},
    create: {
      schoolId,
      schoolYearId,
      classId,
      subjectId,
      teacherUserId,
    },
  });
}

async function ensureTimetableSlot({
  schoolId,
  schoolYearId,
  classId,
  subjectId,
  teacherUserId,
  createdByUserId,
  weekday,
  startMinute,
  endMinute,
  room,
}) {
  const existing = await prisma.classTimetableSlot.findFirst({
    where: {
      schoolId,
      schoolYearId,
      classId,
      subjectId,
      teacherUserId,
      weekday,
      startMinute,
      endMinute,
      room,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.classTimetableSlot.create({
    data: {
      schoolId,
      schoolYearId,
      classId,
      subjectId,
      teacherUserId,
      createdByUserId,
      weekday,
      startMinute,
      endMinute,
      room,
    },
  });
}

async function ensureEvaluation({
  schoolId,
  schoolYearId,
  classId,
  subjectId,
  subjectBranchId,
  evaluationTypeId,
  authorUserId,
  title,
  description,
  coefficient,
  maxScore,
  term,
  status,
  scheduledAt,
  publishedAt,
}) {
  const existing = await prisma.evaluation.findFirst({
    where: {
      schoolId,
      classId,
      subjectId,
      authorUserId,
      title,
    },
  });

  if (existing) {
    return prisma.evaluation.update({
      where: { id: existing.id },
      data: {
        schoolYearId,
        subjectBranchId,
        evaluationTypeId,
        description,
        coefficient,
        maxScore,
        term,
        status,
        scheduledAt,
        publishedAt,
      },
    });
  }

  return prisma.evaluation.create({
    data: {
      schoolId,
      schoolYearId,
      classId,
      subjectId,
      subjectBranchId,
      evaluationTypeId,
      authorUserId,
      title,
      description,
      coefficient,
      maxScore,
      term,
      status,
      scheduledAt,
      publishedAt,
    },
  });
}

async function ensureLifeEvent({
  schoolId,
  schoolYearId,
  classId,
  studentId,
  authorUserId,
  type,
  occurredAt,
  durationMinutes,
  justified,
  reason,
  comment,
}) {
  const existing = await prisma.studentLifeEvent.findFirst({
    where: {
      schoolId,
      studentId,
      authorUserId,
      occurredAt,
      reason,
    },
  });

  if (existing) {
    return prisma.studentLifeEvent.update({
      where: { id: existing.id },
      data: {
        classId,
        schoolYearId,
        type,
        durationMinutes,
        justified,
        comment,
      },
    });
  }

  return prisma.studentLifeEvent.create({
    data: {
      schoolId,
      schoolYearId,
      classId,
      studentId,
      authorUserId,
      type,
      occurredAt,
      durationMinutes,
      justified,
      reason,
      comment,
    },
  });
}

async function ensureFeedPost({
  schoolId,
  classId,
  className,
  academicLevelId,
  authorUserId,
  type,
  title,
  bodyHtml,
  pollQuestion,
  pollOptionsJson,
}) {
  const existing = await prisma.feedPost.findFirst({
    where: {
      schoolId,
      authorUserId,
      audienceClassId: classId,
      title,
    },
  });

  if (existing) {
    return prisma.feedPost.update({
      where: { id: existing.id },
      data: {
        type,
        bodyHtml,
        audienceScope: FeedAudienceScope.CLASS,
        audienceLabel: `Classe ${className}`,
        audienceClassId: classId,
        audienceLevelId: academicLevelId,
        pollQuestion: pollQuestion ?? null,
        pollOptionsJson: pollOptionsJson ?? null,
      },
    });
  }

  return prisma.feedPost.create({
    data: {
      schoolId,
      authorUserId,
      type,
      title,
      bodyHtml,
      audienceScope: FeedAudienceScope.CLASS,
      audienceLabel: `Classe ${className}`,
      audienceClassId: classId,
      audienceLevelId: academicLevelId,
      pollQuestion: pollQuestion ?? null,
      pollOptionsJson: pollOptionsJson ?? null,
    },
  });
}

async function ensureFeedComment({ postId, schoolId, authorUserId, text }) {
  const existing = await prisma.feedComment.findFirst({
    where: { postId, authorUserId, text },
  });

  if (existing) {
    return existing;
  }

  return prisma.feedComment.create({
    data: { postId, schoolId, authorUserId, text },
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refus de seed plizaweb en production.");
  }

  const school = await prisma.school.findUnique({
    where: { slug: SCHOOL_SLUG },
    include: {
      activeSchoolYear: true,
    },
  });

  if (!school?.activeSchoolYearId) {
    throw new Error(
      `Ecole ou annee scolaire active introuvable pour ${SCHOOL_SLUG}`,
    );
  }

  const [
    teacherUser,
    primaryClass,
    secondaryClass,
    allTeachers,
    subjects,
    evaluationTypes,
    branches,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { email: TEST_TEACHER_EMAIL },
      include: {
        memberships: true,
      },
    }),
    prisma.class.findFirst({
      where: {
        schoolId: school.id,
        schoolYearId: school.activeSchoolYearId,
        name: PRIMARY_CLASS_NAME,
      },
    }),
    prisma.class.findFirst({
      where: {
        schoolId: school.id,
        schoolYearId: school.activeSchoolYearId,
        name: SECONDARY_CLASS_NAME,
      },
    }),
    prisma.user.findMany({
      where: {
        memberships: {
          some: {
            schoolId: school.id,
            role: "TEACHER",
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    }),
    prisma.subject.findMany({
      where: { schoolId: school.id },
    }),
    prisma.evaluationType.findMany({
      where: { schoolId: school.id },
    }),
    prisma.subjectBranch.findMany({
      where: { schoolId: school.id },
      include: { subject: true },
    }),
  ]);

  if (!teacherUser) {
    throw new Error(`Utilisateur introuvable pour ${TEST_TEACHER_EMAIL}`);
  }
  if (!primaryClass || !secondaryClass) {
    throw new Error("Classes cibles 6eC / 6eB introuvables.");
  }

  const teacherByEmail = new Map(
    allTeachers.map((entry) => [entry.email, entry]),
  );
  const subjectByName = new Map(subjects.map((entry) => [entry.name, entry]));
  const evalTypeByCode = new Map(
    evaluationTypes.map((entry) => [entry.code, entry]),
  );
  const branchBySubjectAndName = new Map(
    branches.map((entry) => [`${entry.subject.name}::${entry.name}`, entry]),
  );

  const requiredTeacherEmails = [
    TEST_TEACHER_EMAIL,
    "teacher-237610101032-06402ddc@noemail.scolive.local",
    "teacher-237610101033-a381a5c2@noemail.scolive.local",
    "teacher-237610101034-28ea2cf3@noemail.scolive.local",
    "teacher-237610101031-5ad13552@noemail.scolive.local",
    "teacher-237610101040-65660ba5@noemail.scolive.local",
  ];

  for (const email of requiredTeacherEmails) {
    if (!teacherByEmail.has(email)) {
      throw new Error(`Enseignant introuvable pour ${email}`);
    }
  }

  const assignmentsByClass = {
    [primaryClass.id]: [
      { teacherEmail: TEST_TEACHER_EMAIL, subjectName: "Géographie" },
    ],
    [secondaryClass.id]: [
      { teacherEmail: TEST_TEACHER_EMAIL, subjectName: "Anglais" },
      {
        teacherEmail: "teacher-237610101031-5ad13552@noemail.scolive.local",
        subjectName: "Chimie",
      },
      {
        teacherEmail: "teacher-237610101032-06402ddc@noemail.scolive.local",
        subjectName: "Géographie",
      },
      {
        teacherEmail: "teacher-237610101033-a381a5c2@noemail.scolive.local",
        subjectName: "Physique",
      },
      {
        teacherEmail: "teacher-237610101034-28ea2cf3@noemail.scolive.local",
        subjectName: "Technologie",
      },
    ],
  };

  for (const [classId, entries] of Object.entries(assignmentsByClass)) {
    for (const entry of entries) {
      await ensureTeachingAssignment({
        schoolId: school.id,
        schoolYearId: school.activeSchoolYearId,
        classId,
        subjectId: subjectByName.get(entry.subjectName).id,
        teacherUserId: teacherByEmail.get(entry.teacherEmail).id,
      });
    }
  }

  await prisma.class.update({
    where: { id: secondaryClass.id },
    data: {
      referentTeacherUserId: teacherUser.id,
    },
  });

  const extraStudents = [];
  for (const studentInput of NEW_STUDENTS_6EB) {
    extraStudents.push(
      await ensureStudentForClass({
        schoolId: school.id,
        schoolYearId: school.activeSchoolYearId,
        classId: secondaryClass.id,
        ...studentInput,
      }),
    );
  }

  const [students6EC, students6EB] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        classId: primaryClass.id,
        schoolYearId: school.activeSchoolYearId,
        status: "ACTIVE",
      },
      include: { student: true },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    }),
    prisma.enrollment.findMany({
      where: {
        classId: secondaryClass.id,
        schoolYearId: school.activeSchoolYearId,
        status: "ACTIVE",
      },
      include: { student: true },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    }),
  ]);

  const studentByName6EC = new Map(
    students6EC.map((entry) => [keyForStudent(entry.student), entry.student]),
  );
  const studentByName6EB = new Map(
    students6EB.map((entry) => [keyForStudent(entry.student), entry.student]),
  );

  for (const subjectName of Object.keys(COLOR_BY_SUBJECT)) {
    const subject = subjectByName.get(subjectName);
    await prisma.classTimetableSubjectStyle.upsert({
      where: {
        schoolId_schoolYearId_classId_subjectId: {
          schoolId: school.id,
          schoolYearId: school.activeSchoolYearId,
          classId: secondaryClass.id,
          subjectId: subject.id,
        },
      },
      update: {
        colorHex: COLOR_BY_SUBJECT[subjectName],
      },
      create: {
        schoolId: school.id,
        schoolYearId: school.activeSchoolYearId,
        classId: secondaryClass.id,
        subjectId: subject.id,
        colorHex: COLOR_BY_SUBJECT[subjectName],
      },
    });
  }

  const subjectTeacherByName6EB = {
    Anglais: teacherByEmail.get(TEST_TEACHER_EMAIL),
    Chimie: teacherByEmail.get(
      "teacher-237610101031-5ad13552@noemail.scolive.local",
    ),
    Géographie: teacherByEmail.get(
      "teacher-237610101032-06402ddc@noemail.scolive.local",
    ),
    Physique: teacherByEmail.get(
      "teacher-237610101033-a381a5c2@noemail.scolive.local",
    ),
    Technologie: teacherByEmail.get(
      "teacher-237610101034-28ea2cf3@noemail.scolive.local",
    ),
  };

  for (const slot of TIMETABLE_TEMPLATE_6EB) {
    await ensureTimetableSlot({
      schoolId: school.id,
      schoolYearId: school.activeSchoolYearId,
      classId: secondaryClass.id,
      subjectId: subjectByName.get(slot.subject).id,
      teacherUserId: subjectTeacherByName6EB[slot.subject].id,
      createdByUserId: teacherUser.id,
      weekday: slot.weekday,
      startMinute: slot.startMinute,
      endMinute: slot.endMinute,
      room: slot.room,
    });
  }

  for (const evaluationInput of EVALUATIONS_6EC) {
    const classEntity = primaryClass;
    const studentMap = studentByName6EC;
    const subject = subjectByName.get(evaluationInput.subjectName);
    const branch = branchBySubjectAndName.get(
      `${evaluationInput.subjectName}::${evaluationInput.branchName}`,
    );
    const evalType = evalTypeByCode.get(evaluationInput.typeCode);

    const evaluation = await ensureEvaluation({
      schoolId: school.id,
      schoolYearId: school.activeSchoolYearId,
      classId: classEntity.id,
      subjectId: subject.id,
      subjectBranchId: branch?.id ?? null,
      evaluationTypeId: evalType.id,
      authorUserId: teacherUser.id,
      title: evaluationInput.title,
      description: evaluationInput.description,
      coefficient: evaluationInput.coefficient,
      maxScore: evaluationInput.maxScore,
      term: evaluationInput.term,
      status: evaluationInput.status,
      scheduledAt: new Date(evaluationInput.scheduledAt),
      publishedAt: evaluationInput.publishedAt
        ? new Date(evaluationInput.publishedAt)
        : null,
    });

    for (const [studentName, scoreInput] of Object.entries(
      evaluationInput.scores,
    )) {
      const student = studentMap.get(studentName);
      if (!student) {
        throw new Error(
          `Eleve introuvable pour ${studentName} dans ${classEntity.name}`,
        );
      }

      await prisma.studentEvaluationScore.upsert({
        where: {
          evaluationId_studentId: {
            evaluationId: evaluation.id,
            studentId: student.id,
          },
        },
        update: {
          score: scoreInput.score ?? null,
          comment: scoreInput.comment ?? null,
          status: scoreInput.status ?? EvaluationScoreStatus.ENTERED,
        },
        create: {
          evaluationId: evaluation.id,
          studentId: student.id,
          score: scoreInput.score ?? null,
          comment: scoreInput.comment ?? null,
          status: scoreInput.status ?? EvaluationScoreStatus.ENTERED,
        },
      });
    }
  }

  for (const evaluationInput of EVALUATIONS_6EB) {
    const classEntity = secondaryClass;
    const studentMap = studentByName6EB;
    const subject = subjectByName.get(evaluationInput.subjectName);
    const branch = branchBySubjectAndName.get(
      `${evaluationInput.subjectName}::${evaluationInput.branchName}`,
    );
    const evalType = evalTypeByCode.get(evaluationInput.typeCode);

    const evaluation = await ensureEvaluation({
      schoolId: school.id,
      schoolYearId: school.activeSchoolYearId,
      classId: classEntity.id,
      subjectId: subject.id,
      subjectBranchId: branch?.id ?? null,
      evaluationTypeId: evalType.id,
      authorUserId: teacherUser.id,
      title: evaluationInput.title,
      description: evaluationInput.description,
      coefficient: evaluationInput.coefficient,
      maxScore: evaluationInput.maxScore,
      term: evaluationInput.term,
      status: evaluationInput.status,
      scheduledAt: new Date(evaluationInput.scheduledAt),
      publishedAt: evaluationInput.publishedAt
        ? new Date(evaluationInput.publishedAt)
        : null,
    });

    for (const [studentName, scoreInput] of Object.entries(
      evaluationInput.scores,
    )) {
      const student = studentMap.get(studentName);
      if (!student) {
        throw new Error(
          `Eleve introuvable pour ${studentName} dans ${classEntity.name}`,
        );
      }

      await prisma.studentEvaluationScore.upsert({
        where: {
          evaluationId_studentId: {
            evaluationId: evaluation.id,
            studentId: student.id,
          },
        },
        update: {
          score: scoreInput.score ?? null,
          comment: scoreInput.comment ?? null,
          status: scoreInput.status ?? EvaluationScoreStatus.ENTERED,
        },
        create: {
          evaluationId: evaluation.id,
          studentId: student.id,
          score: scoreInput.score ?? null,
          comment: scoreInput.comment ?? null,
          status: scoreInput.status ?? EvaluationScoreStatus.ENTERED,
        },
      });
    }
  }

  for (const eventInput of LIFE_EVENTS_6EC) {
    const author = teacherByEmail.get(eventInput.authorEmail);
    const student = studentByName6EC.get(eventInput.studentName);
    await ensureLifeEvent({
      schoolId: school.id,
      schoolYearId: school.activeSchoolYearId,
      classId: primaryClass.id,
      studentId: student.id,
      authorUserId: author.id,
      type: eventInput.type,
      occurredAt: new Date(eventInput.occurredAt),
      durationMinutes: eventInput.durationMinutes,
      justified: eventInput.justified,
      reason: eventInput.reason,
      comment: eventInput.comment,
    });
  }

  for (const eventInput of LIFE_EVENTS_6EB) {
    const author = teacherByEmail.get(eventInput.authorEmail);
    const student = studentByName6EB.get(eventInput.studentName);
    await ensureLifeEvent({
      schoolId: school.id,
      schoolYearId: school.activeSchoolYearId,
      classId: secondaryClass.id,
      studentId: student.id,
      authorUserId: author.id,
      type: eventInput.type,
      occurredAt: new Date(eventInput.occurredAt),
      durationMinutes: eventInput.durationMinutes,
      justified: eventInput.justified,
      reason: eventInput.reason,
      comment: eventInput.comment,
    });
  }

  const postByTitle = new Map();
  for (const postInput of FEED_POSTS) {
    const classEntity =
      postInput.className === PRIMARY_CLASS_NAME
        ? primaryClass
        : secondaryClass;
    const author = teacherByEmail.get(postInput.authorEmail);
    const post = await ensureFeedPost({
      schoolId: school.id,
      classId: classEntity.id,
      className: classEntity.name,
      academicLevelId: classEntity.academicLevelId,
      authorUserId: author.id,
      type: postInput.type,
      title: postInput.title,
      bodyHtml: postInput.bodyHtml,
      pollQuestion: postInput.pollQuestion,
      pollOptionsJson: postInput.pollOptionsJson,
    });
    postByTitle.set(postInput.title, post);
  }

  for (const commentInput of FEED_COMMENTS) {
    const post = postByTitle.get(commentInput.postTitle);
    const author = teacherByEmail.get(commentInput.authorEmail);
    await ensureFeedComment({
      postId: post.id,
      schoolId: school.id,
      authorUserId: author.id,
      text: commentInput.text,
    });
  }

  const summary = {
    teacher: {
      email: teacherUser.email,
      id: teacherUser.id,
    },
    classes: {
      [PRIMARY_CLASS_NAME]: {
        classId: primaryClass.id,
        subjectAssigned: "Géographie",
        students: students6EC.map((entry) => keyForStudent(entry.student)),
      },
      [SECONDARY_CLASS_NAME]: {
        classId: secondaryClass.id,
        referentTeacherUserId: teacherUser.id,
        subjectAssigned: "Anglais",
        students: students6EB.map((entry) => keyForStudent(entry.student)),
        timetableSlotsSeeded: TIMETABLE_TEMPLATE_6EB.length,
      },
    },
    seeded: {
      newStudents6EB: extraStudents.map(keyForStudent),
      evaluations6EC: EVALUATIONS_6EC.length,
      evaluations6EB: EVALUATIONS_6EB.length,
      lifeEvents6EC: LIFE_EVENTS_6EC.length,
      lifeEvents6EB: LIFE_EVENTS_6EB.length,
      feedPosts: FEED_POSTS.length,
      feedComments: FEED_COMMENTS.length,
    },
  };

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
