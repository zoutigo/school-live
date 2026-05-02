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

const SCHOOL_SLUG = "college-vogt";
const TARGET_CLASSES = ["6eB", "6eC"];

const DATE_MATRIX = {
  "6eB": [
    ["2026-04-30T17:00:00.000Z", "2026-05-08T17:00:00.000Z"],
    ["2026-05-04T17:30:00.000Z", "2026-05-11T17:30:00.000Z"],
    ["2026-05-05T16:45:00.000Z", "2026-05-14T16:45:00.000Z"],
    ["2026-05-06T18:00:00.000Z", "2026-05-18T18:00:00.000Z"],
    ["2026-05-07T17:15:00.000Z", "2026-05-20T17:15:00.000Z"],
  ],
  "6eC": [
    ["2026-04-29T17:00:00.000Z", "2026-05-06T17:00:00.000Z"],
    ["2026-05-04T17:30:00.000Z", "2026-05-09T17:30:00.000Z"],
    ["2026-05-05T18:00:00.000Z", "2026-05-13T18:00:00.000Z"],
    ["2026-05-06T16:45:00.000Z", "2026-05-15T16:45:00.000Z"],
    ["2026-05-07T17:15:00.000Z", "2026-05-19T17:15:00.000Z"],
    ["2026-05-12T17:00:00.000Z", "2026-05-22T17:00:00.000Z"],
  ],
};

const SUBJECT_HOMEWORKS = {
  Anglais: [
    {
      title: "Apprendre le vocabulaire de la routine quotidienne",
      bodyHtml:
        "<p>Reprendre la lecon sur la routine quotidienne.</p><ul><li>Memoriser au moins 12 verbes usuels.</li><li>Rediger 6 phrases completes au present simple.</li><li>Revoir la prononciation des heures.</li></ul><p>Le travail sera verifie dans le cahier d'anglais.</p>",
      teacherComment:
        "Pensez a presenter les phrases proprement et a souligner les verbes.",
      parentComment:
        "Le vocabulaire a ete appris ce soir, il reste la relecture des phrases.",
    },
    {
      title: "Preparation de la comprehension ecrite",
      bodyHtml:
        "<p>Lire le court texte distribue en classe et relever les informations principales.</p><ul><li>Identifier les personnages.</li><li>Noter les verbes inconnus dans le cahier.</li><li>Repondre aux 5 questions au bas de la fiche.</li></ul><p>Un temps de correction collective est prevu en debut de seance.</p>",
      teacherComment:
        "La lecture doit etre faite a la maison avant la correction collective.",
      parentComment:
        "Lecture faite avec aide pour les mots nouveaux; les reponses sont deja commencees.",
    },
  ],
  Chimie: [
    {
      title: "Compte rendu sur les melanges observes en laboratoire",
      bodyHtml:
        "<p>Rediger le compte rendu de l'experience sur les melanges.</p><ul><li>Rappeler le protocole utilise.</li><li>Completer le tableau d'observations.</li><li>Conclure en distinguant melange homogene et heterogene.</li></ul><p>Le schema du materiel doit etre soigne.</p>",
      teacherComment:
        "Je regarderai surtout la precision des observations et la qualite du schema.",
      parentComment:
        "Le compte rendu est presque termine; il reste la conclusion a reformuler.",
    },
    {
      title: "Revoir les etats de la matiere",
      bodyHtml:
        "<p>Relire la lecon sur les etats de la matiere et completer les exercices 7 a 9.</p><ul><li>Recopier les definitions dans le cahier.</li><li>Associer chaque exemple a l'etat correspondant.</li><li>Tracer le petit schema sur les changements d'etat.</li></ul><p>Les reponses doivent etre justifiees.</p>",
      teacherComment:
        "Les exercices 7 a 9 seront ramasses si besoin en debut de cours.",
      parentComment:
        "Les definitions sont apprises; les exercices seront relus demain matin.",
    },
  ],
  Géographie: [
    {
      title: "Croquis simple sur les paysages du Cameroun",
      bodyHtml:
        "<p>Realiser un croquis legende sur les paysages et les grands reperes vus en classe.</p><ul><li>Utiliser les couleurs du cours.</li><li>Soigner le titre et l'orientation.</li><li>Verifier que la legende est classee.</li></ul><p>Le croquis doit tenir sur une page du cahier.</p>",
      teacherComment:
        "La qualite de la legende comptera autant que le croquis lui-meme.",
      parentComment:
        "Le croquis a ete repris a la regle; il restera a finaliser la legende.",
    },
    {
      title: "Questions de lecon sur population et territoire",
      bodyHtml:
        "<p>Repondre par ecrit aux questions de synthese sur la population et l'occupation du territoire.</p><ul><li>Definir densite et urbanisation.</li><li>Donner deux exemples vus dans le cahier.</li><li>Relire la carte et les chiffres principaux.</li></ul><p>Les reponses doivent etre formulees en phrases completes.</p>",
      teacherComment:
        "Attention au vocabulaire geographique exact dans vos reponses.",
      parentComment:
        "Les definitions ont ete revisees; il reste a completer l'exemple sur l'urbanisation.",
    },
  ],
  Physique: [
    {
      title: "Exercices sur le circuit electrique simple",
      bodyHtml:
        "<p>Faire les exercices du cahier sur le circuit electrique simple.</p><ul><li>Reproduire le schema normalise.</li><li>Identifier le role de chaque composant.</li><li>Expliquer pourquoi la lampe s'allume ou non.</li></ul><p>Les symboles doivent etre correctement traces.</p>",
      teacherComment:
        "Je corrigerai en priorite les schemas et les explications sur le sens du courant.",
      parentComment:
        "Les exercices sont faits, il reste a verifier le schema du deuxieme montage.",
    },
    {
      title: "Preparation de la manipulation sur masse et volume",
      bodyHtml:
        "<p>Relire la fiche de methode sur les mesures de masse et de volume.</p><ul><li>Noter le materiel utilise.</li><li>Revoir les unites.</li><li>Repondre a la question de pre-laboratoire dans le cahier.</li></ul><p>La seance suivante commencera directement par la manipulation.</p>",
      teacherComment:
        "La question preparatoire doit etre faite avant l'arrivee au laboratoire.",
      parentComment:
        "La fiche a ete relue; la question de preparation sera terminee apres le diner.",
    },
  ],
  Technologie: [
    {
      title: "Analyse d'un objet technique du quotidien",
      bodyHtml:
        "<p>Choisir un objet technique simple de la maison et preparer une courte analyse.</p><ul><li>Nommer sa fonction d'usage.</li><li>Identifier deux materiaux utilises.</li><li>Expliquer en quelques lignes ce qui le rend pratique.</li></ul><p>Vous pouvez apporter une photo imprimee ou un dessin.</p>",
      teacherComment:
        "Je veux surtout une analyse personnelle, pas une simple copie du cours.",
      parentComment:
        "L'objet a ete choisi ce soir; la redaction sera terminee demain.",
    },
    {
      title: "Preparation du mini-projet numerique",
      bodyHtml:
        "<p>Preparer le mini-projet numerique commence en classe.</p><ul><li>Verifier les etapes notees dans le cahier.</li><li>Rassembler le materiel demande.</li><li>Rediger la partie 'objectif' du projet.</li></ul><p>Le travail de groupe reprendra au prochain cours.</p>",
      teacherComment:
        "Chaque eleve doit arriver avec sa partie 'objectif' deja redigee.",
      parentComment:
        "Le materiel est pret; l'objectif du projet a ete discute a la maison.",
    },
  ],
};

const GENERIC_HOMEWORKS = [
  {
    title: "Reprise de la lecon et exercices d'application",
    bodyHtml:
      "<p>Relire attentivement la lecon du cahier et faire les exercices notes en classe.</p><ul><li>Reprendre les definitions importantes.</li><li>Faire le travail dans l'ordre.</li><li>Soigner la presentation.</li></ul><p>Ce travail servira d'appui pour le prochain cours.</p>",
    teacherComment:
      "Le travail doit etre autonome mais soigneusement relu avant la prochaine seance.",
    parentComment:
      "Le travail avance bien; une relecture finale sera faite avant le coucher.",
  },
  {
    title: "Preparation de la prochaine seance",
    bodyHtml:
      "<p>Completer la preparation de la prochaine seance avec le cahier de cours.</p><ul><li>Relire les notes prises.</li><li>Faire les consignes demandees.</li><li>Venir avec le cahier a jour.</li></ul><p>Une correction rapide ouvrira le prochain cours.</p>",
    teacherComment:
      "Il faut venir avec le cahier a jour pour profiter de la correction.",
    parentComment:
      "La preparation est bien avancee, il reste a relire les consignes une derniere fois.",
  },
];

function templateForSubject(subjectName, index) {
  const entries = SUBJECT_HOMEWORKS[subjectName] ?? GENERIC_HOMEWORKS;
  return entries[index % entries.length];
}

function completionTimestamp(expectedAt, studentIndex, homeworkIndex) {
  const due = new Date(expectedAt);
  const offsetHours = 20 - studentIndex * 3 - homeworkIndex;
  return new Date(due.getTime() - offsetHours * 60 * 60 * 1000);
}

function uniqueAssignments(assignments) {
  const seen = new Set();
  return assignments.filter((assignment) => {
    const key = `${assignment.teacherUserId}:${assignment.subjectId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function main() {
  const school = await prisma.school.findUnique({
    where: { slug: SCHOOL_SLUG },
    select: { id: true, activeSchoolYearId: true },
  });
  if (!school) {
    throw new Error(`School ${SCHOOL_SLUG} not found`);
  }

  const classes = await prisma.class.findMany({
    where: {
      schoolId: school.id,
      name: { in: TARGET_CLASSES },
    },
    select: {
      id: true,
      name: true,
      schoolYearId: true,
    },
    orderBy: [{ name: "asc" }],
  });

  if (classes.length !== TARGET_CLASSES.length) {
    throw new Error("Missing target classes 6eB/6eC");
  }

  await prisma.homework.deleteMany({
    where: {
      schoolId: school.id,
      classId: { in: classes.map((item) => item.id) },
    },
  });

  let createdCount = 0;

  for (const classEntity of classes) {
    const [assignments, enrollments] = await Promise.all([
      prisma.teacherClassSubject.findMany({
        where: {
          schoolId: school.id,
          classId: classEntity.id,
          schoolYearId: classEntity.schoolYearId,
        },
        include: {
          subject: {
            select: { id: true, name: true },
          },
          teacherUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: [
          { subject: { name: "asc" } },
          { teacherUser: { lastName: "asc" } },
          { teacherUser: { firstName: "asc" } },
        ],
      }),
      prisma.enrollment.findMany({
        where: {
          schoolId: school.id,
          classId: classEntity.id,
          schoolYearId: classEntity.schoolYearId,
          status: "ACTIVE",
        },
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              parentLinks: {
                select: {
                  parent: {
                    select: { id: true, firstName: true, lastName: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
      }),
    ]);

    const classAssignments = uniqueAssignments(assignments);
    const students = enrollments.map((entry) => entry.student);
    const slots = DATE_MATRIX[classEntity.name];

    for (const [assignmentIndex, assignment] of classAssignments.entries()) {
      const slot = slots[assignmentIndex % slots.length];

      for (const homeworkIndex of [0, 1]) {
        const template = templateForSubject(
          assignment.subject.name,
          homeworkIndex,
        );
        const expectedAt = slot[homeworkIndex];
        const doneRatio =
          homeworkIndex === 0 ? 0.7 + (assignmentIndex % 2) * 0.1 : 0.2;
        const doneCount = Math.min(
          students.length,
          Math.max(
            homeworkIndex === 0 ? 1 : 0,
            Math.round(students.length * doneRatio),
          ),
        );
        const doneStudents = students.slice(0, doneCount);
        const parentCommentStudent =
          students.find((student) => student.parentLinks.length > 0) ?? null;

        await prisma.homework.create({
          data: {
            schoolId: school.id,
            schoolYearId: classEntity.schoolYearId,
            classId: classEntity.id,
            subjectId: assignment.subjectId,
            authorUserId: assignment.teacherUserId,
            title: template.title,
            contentHtml: template.bodyHtml,
            expectedAt: new Date(expectedAt),
            comments: {
              create: [
                {
                  schoolId: school.id,
                  authorUserId: assignment.teacherUserId,
                  body: template.teacherComment,
                },
                ...(parentCommentStudent
                  ? [
                      {
                        schoolId: school.id,
                        authorUserId:
                          parentCommentStudent.parentLinks[0].parent.id,
                        studentId: parentCommentStudent.id,
                        body: template.parentComment,
                      },
                    ]
                  : []),
              ],
            },
            completions: {
              create: doneStudents.map((student, studentIndex) => ({
                schoolId: school.id,
                studentId: student.id,
                doneAt: completionTimestamp(
                  expectedAt,
                  studentIndex,
                  homeworkIndex,
                ),
              })),
            },
          },
        });

        createdCount += 1;
      }
    }
  }

  console.log(
    `Seeded ${createdCount} homework entries for ${TARGET_CLASSES.join(", ")}`,
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
