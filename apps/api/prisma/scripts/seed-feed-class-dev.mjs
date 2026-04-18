import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();
const MARKER = "DEV_CLASS_FEED_6EC";
const DEFAULT_SCHOOL_SLUG = "college-vogt";
const DEFAULT_CLASS_NAME = "6e C";

function normalizeLabel(value) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function pickRotating(list, index) {
  if (list.length === 0) {
    return null;
  }
  return list[index % list.length];
}

function uniqueById(list) {
  return [
    ...new Map(list.filter(Boolean).map((entry) => [entry.id, entry])).values(),
  ];
}

function isoDaysAgo(days, hour = 8, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

const POST_TEMPLATES = [
  {
    title: "Rappel devoir surveille d'anglais",
    body: "<p>Le devoir surveille d'anglais est maintenu vendredi a 08h45.</p><p>Merci de prevoir la lecon 4, le cahier d'exercices et une trousse complete.</p>",
  },
  {
    title: "Organisation repetition chorale",
    body: "<p>La repetition de chorale de cette semaine se tiendra jeudi apres les cours.</p><p>Les eleves concernes restent en salle polyvalente jusqu'a 16h15.</p>",
  },
  {
    title: "Point lecture en francais",
    body: "<p>Les lectures suivies avancent bien. Merci d'encourager les eleves a finir le chapitre 6 avant lundi.</p>",
  },
  {
    title: "Materiel pour travaux pratiques de sciences",
    body: "<p>Pour les activites de sciences, chaque eleve doit apporter une petite bouteille vide, une cuillere et son cahier de laboratoire.</p>",
  },
  {
    title: "Sortie pedagogique au musee",
    body: "<p>La sortie pedagogique au musee national est confirmee pour mardi prochain.</p><p>Depart a 08h00, retour prevu a 15h30.</p>",
  },
  {
    title: "Bon comportement en classe cette semaine",
    body: "<p>La 6e C a montre une belle progression sur la ponctualite et le respect des consignes.</p><p>Merci aux familles pour le suivi quotidien.</p>",
  },
  {
    title: "Rappel tenue EPS",
    body: "<p>Les cours d'EPS du mercredi necessitent une tenue complete, une bouteille d'eau et des chaussures adaptees.</p>",
  },
  {
    title: "Seance de remediation mathematiques",
    body: "<p>Une seance de remediation en mathematiques est proposee vendredi de 15h00 a 16h00 pour les eleves qui le souhaitent.</p>",
  },
  {
    title: "Atelier d'ecriture creatrice",
    body: "<p>L'atelier d'ecriture creatrice a permis de produire de tres beaux textes.</p><p>Les copies seront relues en classe lundi.</p>",
  },
  {
    title: "Rappel ponctualite matinale",
    body: "<p>Plusieurs eleves arrivent encore apres la sonnerie du premier cours.</p><p>Merci de renforcer l'organisation du depart a la maison.</p>",
  },
  {
    title: "Evaluation histoire-geographie",
    body: "<p>L'evaluation d'histoire-geographie portera sur les reperes chronologiques et la lecture de carte.</p>",
  },
  {
    title: "Collecte pour le club environnement",
    body: "<p>La classe participe a une collecte de bouteilles plastiques et de cartons propres pour les ateliers de recyclage.</p>",
  },
  {
    title: "Compte rendu conseil pedagogique",
    body: "<p>L'equipe pedagogique note une classe dynamique, avec une participation orale en hausse et quelques efforts attendus sur l'autonomie.</p>",
  },
  {
    title: "Repetition expose EMC",
    body: "<p>Les groupes d'expose EMC passent en classe la semaine prochaine. Merci de verifier que les supports sont prets.</p>",
  },
  {
    title: "Retour sur la dictée hebdomadaire",
    body: "<p>Les resultats de la dictee sont globalement satisfaisants. Les accords dans le groupe nominal restent a retravailler.</p>",
  },
  {
    title: "Sensibilisation usage du telephone",
    body: "<p>Un rappel a ete fait en classe sur l'interdiction du telephone pendant les heures de cours et d'etude.</p>",
  },
  {
    title: "Preparation fete de l'ecole",
    body: "<p>Les eleves de 6e C preparent un numero collectif pour la fete de l'ecole. Les repetitions commencent lundi.</p>",
  },
  {
    title: "Revision expression ecrite",
    body: "<p>Merci de faire reprendre les connecteurs logiques et la structure du recit a la maison avant le prochain devoir.</p>",
  },
  {
    title: "Information bibliotheque",
    body: "<p>Les retards de restitution des livres diminuent. Les ouvrages empruntes cette quinzaine devront etre rendus avant vendredi.</p>",
  },
  {
    title: "Message de felicitations",
    body: "<p>Bravo a la classe pour son implication pendant la semaine culturelle. L'attitude generale a ete exemplaire.</p>",
  },
];

const POLL_TEMPLATES = [
  {
    title: "Choix du prochain livre suivi",
    question: "Quel livre souhaitez-vous lire en classe le mois prochain ?",
    options: ["Le Petit Prince", "Cendrillon", "Contes du Cameroun", "Alice"],
  },
  {
    title: "Organisation de la sortie pedagogique",
    question: "Quel format de sortie vous semble le plus utile ?",
    options: [
      "Musee + atelier",
      "Visite de site historique",
      "Parcours scientifique",
      "Sortie nature",
    ],
  },
  {
    title: "Horaire de soutien prefere",
    question: "Quel horaire de soutien convient le mieux ?",
    options: [
      "Mercredi 14h",
      "Vendredi 15h",
      "Samedi 09h",
      "Pas de preference",
    ],
  },
  {
    title: "Theme de l'expose collectif",
    question: "Quel theme collectif souhaitez-vous travailler ?",
    options: [
      "Protection de l'environnement",
      "Figures historiques",
      "Sciences du quotidien",
      "Contes et legendes",
    ],
  },
  {
    title: "Activite pour la fete de l'ecole",
    question: "Quelle activite represente le mieux la classe ?",
    options: ["Chorale", "Sketch", "Poeme collectif", "Danse traditionnelle"],
  },
  {
    title: "Methode de revision preferee",
    question: "Quelle methode aide le plus a reviser ?",
    options: ["Fiches", "Quiz oral", "Exercices ecrits", "Travail en binome"],
  },
  {
    title: "Projet de classe du trimestre",
    question: "Quel projet souhaitez-vous prioriser ?",
    options: [
      "Jardin scolaire",
      "Journal mural",
      "Coin lecture",
      "Mini expo scientifique",
    ],
  },
  {
    title: "Choix du prochain atelier",
    question: "Quel atelier souhaitez-vous voir revenir ?",
    options: ["Ecriture", "Theatre", "Sciences", "Arts plastiques"],
  },
  {
    title: "Format du rappel de devoirs",
    question: "Quel type de rappel est le plus utile pour les familles ?",
    options: [
      "Message court",
      "Recap hebdomadaire",
      "Photo du tableau",
      "Calendrier mensuel",
    ],
  },
  {
    title: "Idee de recompense collective",
    question: "Quelle recompense collective motiverait le plus la classe ?",
    options: [
      "Temps lecture libre",
      "Jeu educatif",
      "Projection video",
      "Activite sportive",
    ],
  },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refus de seed feed en production.");
  }

  const schoolSlug = process.env.SCHOOL_SLUG?.trim() || DEFAULT_SCHOOL_SLUG;
  const targetClassName = process.env.CLASS_NAME?.trim() || DEFAULT_CLASS_NAME;

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: {
      id: true,
      slug: true,
      activeSchoolYearId: true,
    },
  });

  if (!school) {
    throw new Error(`Ecole introuvable pour slug=${schoolSlug}`);
  }

  const classes = await prisma.class.findMany({
    where: {
      schoolId: school.id,
      ...(school.activeSchoolYearId
        ? { schoolYearId: school.activeSchoolYearId }
        : {}),
    },
    select: {
      id: true,
      name: true,
      academicLevelId: true,
      schoolYearId: true,
      referentTeacherUserId: true,
    },
  });

  const targetClass =
    classes.find(
      (entry) => normalizeLabel(entry.name) === normalizeLabel(targetClassName),
    ) ??
    classes.find((entry) =>
      normalizeLabel(entry.name).includes(normalizeLabel(targetClassName)),
    );

  if (!targetClass) {
    throw new Error(`Classe introuvable pour name=${targetClassName}`);
  }

  const assignments = await prisma.teacherClassSubject.findMany({
    where: { classId: targetClass.id },
    select: { teacherUserId: true },
  });
  const timetableTeachers = await prisma.classTimetableSlot.findMany({
    where: { classId: targetClass.id },
    select: { teacherUserId: true },
  });
  const staffMemberships = await prisma.schoolMembership.findMany({
    where: {
      schoolId: school.id,
      role: {
        in: [
          "SCHOOL_ADMIN",
          "SCHOOL_MANAGER",
          "SUPERVISOR",
          "SCHOOL_ACCOUNTANT",
          "SCHOOL_STAFF",
          "TEACHER",
        ],
      },
    },
    select: {
      role: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
  const classStudents = await prisma.enrollment.findMany({
    where: {
      classId: targetClass.id,
      schoolYearId: targetClass.schoolYearId,
      status: "ACTIVE",
    },
    select: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          parentLinks: {
            select: {
              parent: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const teacherUserIds = new Set(
    [
      targetClass.referentTeacherUserId,
      ...assignments.map((entry) => entry.teacherUserId),
      ...timetableTeachers.map((entry) => entry.teacherUserId),
    ].filter(Boolean),
  );

  const staffAuthors = uniqueById([
    ...staffMemberships
      .filter((entry) => teacherUserIds.has(entry.user.id))
      .map((entry) => entry.user),
    ...staffMemberships.map((entry) => entry.user),
  ]);

  const classStudentUsers = uniqueById(
    classStudents.map((entry) => entry.student.user).filter(Boolean),
  );
  const classParentUsers = uniqueById(
    classStudents.flatMap((entry) =>
      entry.student.parentLinks.map((link) => link.parent),
    ),
  );
  const reactionUsers = uniqueById([
    ...staffAuthors,
    ...classParentUsers,
    ...classStudentUsers,
  ]);

  if (staffAuthors.length === 0) {
    throw new Error(
      "Aucun auteur staff/teacher disponible pour la classe cible.",
    );
  }

  await prisma.feedPost.deleteMany({
    where: {
      schoolId: school.id,
      audienceScope: "CLASS",
      audienceClassId: targetClass.id,
      bodyHtml: { contains: MARKER },
    },
  });

  const templates = [
    ...POST_TEMPLATES.map((entry) => ({ ...entry, type: "POST" })),
    ...POLL_TEMPLATES.map((entry) => ({
      ...entry,
      type: "POLL",
      body: "<p>Merci de voter ci-dessous afin d'aider l'equipe pedagogique a prendre une decision adaptee a la classe.</p>",
    })),
  ];

  const created = [];
  for (let index = 0; index < 30; index += 1) {
    const template = templates[index % templates.length];
    const author = pickRotating(staffAuthors, index);
    const createdAt = isoDaysAgo(30 - index, 7 + (index % 7), (index * 7) % 60);
    const featuredUntil =
      index % 6 === 0
        ? new Date(Date.now() + ((index % 4) + 2) * 24 * 60 * 60 * 1000)
        : null;

    const pollOptions =
      template.type === "POLL"
        ? template.options.map((label, optionIndex) => ({
            id: `opt-${index + 1}-${optionIndex + 1}`,
            label,
            votes: 0,
          }))
        : undefined;

    const post = await prisma.feedPost.create({
      data: {
        schoolId: school.id,
        authorUserId: author.id,
        type: template.type,
        title: template.title,
        bodyHtml: `${template.body}\n<!-- ${MARKER} -->`,
        audienceScope: "CLASS",
        audienceLabel: `Classe ${targetClass.name}`,
        audienceClassId: targetClass.id,
        audienceLevelId: targetClass.academicLevelId,
        featuredUntil,
        pollQuestion: template.type === "POLL" ? template.question : null,
        pollOptionsJson: pollOptions,
        createdAt,
      },
    });

    created.push({ post, pollOptions });
  }

  for (const [index, entry] of created.entries()) {
    const commentAuthors = uniqueById([
      pickRotating(classParentUsers, index),
      pickRotating(classStudentUsers, index + 1),
      pickRotating(staffAuthors, index + 2),
    ]).filter(Boolean);

    for (const [commentIndex, author] of commentAuthors.entries()) {
      await prisma.feedComment.create({
        data: {
          postId: entry.post.id,
          schoolId: school.id,
          authorUserId: author.id,
          text:
            commentIndex === 0
              ? "Merci pour l'information, nous avons bien pris note."
              : commentIndex === 1
                ? "Message bien recu, cela aide beaucoup pour l'organisation."
                : "Bonne initiative, la classe en parlera au prochain cours.",
          createdAt: isoDaysAgo(
            Math.max(0, 20 - index),
            16,
            10 + commentIndex * 8,
          ),
        },
      });
    }

    const likeUsers = reactionUsers.slice(0, Math.min(6, reactionUsers.length));
    for (const liker of likeUsers) {
      await prisma.feedLike.upsert({
        where: {
          postId_userId: {
            postId: entry.post.id,
            userId: liker.id,
          },
        },
        update: {},
        create: {
          postId: entry.post.id,
          schoolId: school.id,
          userId: liker.id,
        },
      });
    }

    if (entry.post.type === "POLL" && entry.pollOptions) {
      const voters = reactionUsers.slice(0, Math.min(10, reactionUsers.length));
      const voteCounts = entry.pollOptions.map((option) => ({
        ...option,
        votes: 0,
      }));

      for (const [voteIndex, voter] of voters.entries()) {
        const option = voteCounts[voteIndex % voteCounts.length];
        option.votes += 1;
        await prisma.feedPollVote.upsert({
          where: {
            postId_userId: {
              postId: entry.post.id,
              userId: voter.id,
            },
          },
          update: { optionId: option.id },
          create: {
            postId: entry.post.id,
            schoolId: school.id,
            userId: voter.id,
            optionId: option.id,
          },
        });
      }

      await prisma.feedPost.update({
        where: { id: entry.post.id },
        data: {
          pollOptionsJson: voteCounts,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        schoolSlug: school.slug,
        classId: targetClass.id,
        className: targetClass.name,
        postsCreated: created.length,
        teachersUsed: staffAuthors.length,
        parentsAvailable: classParentUsers.length,
        studentsAvailable: classStudentUsers.length,
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
