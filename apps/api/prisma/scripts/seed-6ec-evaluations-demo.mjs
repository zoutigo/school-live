import {
  EvaluationScoreStatus,
  EvaluationStatus,
  PrismaClient,
  Term,
  TermReportStatus,
} from "@prisma/client";

const prisma = new PrismaClient();
const TITLE_PREFIX = "[DEMO 6eC]";
const SCHOOL_SLUG = "college-vogt";
const CLASS_NAME = "6eC";

const BRANCHES_BY_SUBJECT = {
  Anglais: ["Grammaire", "Expression ecrite"],
  Chimie: ["Melanges", "Transformations"],
  Géographie: ["Relief", "Population"],
  Physique: ["Electricite", "Mecanique"],
  Technologie: ["Numerique", "Objets techniques"],
};

const EVALUATION_TYPES = [
  { code: "DEVOIR", label: "Devoir" },
  { code: "INTERROGATION", label: "Interrogation" },
  { code: "COMPOSITION", label: "Composition" },
  { code: "TP", label: "TP / Projet" },
  { code: "ORAL", label: "Oral" },
];

const SUBJECT_TEMPLATES = {
  Anglais: {
    titles: [
      "Verbes usuels",
      "Comprendre un dialogue",
      "Expression ecrite courte",
      "Vocabulaire de la famille",
      "Questions et reponses",
      "Reading comprehension",
      "Dictation guidee",
      "Production ecrite",
      "Grammar checkpoint",
      "Speaking practice",
    ],
    description:
      "Evaluation progressive en anglais sur les competences du chapitre.",
    baseScores: [16.5, 13.2],
  },
  Chimie: {
    titles: [
      "Observation des melanges",
      "Materiaux du quotidien",
      "Separation des corps",
      "Etats de la matiere",
      "Experience simple",
      "Changements d'etat",
      "Questionnaire de cours",
      "Schema de laboratoire",
      "Analyse de resultat",
      "Bilan du chapitre",
    ],
    description:
      "Questions de cours et mise en application experimentale en chimie.",
    baseScores: [14.8, 11.6],
  },
  Géographie: {
    titles: [
      "Lire une carte",
      "Reperes territoriaux",
      "Le relief",
      "Les climats",
      "Population et territoire",
      "Etude de document",
      "Croquis simple",
      "Questionnaire localiser",
      "Composition courte",
      "Bilan de chapitre",
    ],
    description:
      "Evaluation de geographie sur les reperes et la lecture de documents.",
    baseScores: [13.8, 10.9],
  },
  Physique: {
    titles: [
      "Circuit simple",
      "Les conducteurs",
      "Mouvement et vitesse",
      "Forces et actions",
      "Mesures en laboratoire",
      "Montage pratique",
      "Questionnaire de notions",
      "Experience guidee",
      "Problemes de mecanique",
      "Bilan de sequence",
    ],
    description:
      "Evaluation de physique alternant pratiques, observations et exercices.",
    baseScores: [17.2, 13.7],
  },
  Technologie: {
    titles: [
      "Presenter un objet technique",
      "Fonction d'usage",
      "Numerique et securite",
      "Schema technique",
      "Projet mini-maquette",
      "Recherche documentaire",
      "Analyse d'objet",
      "Oral de restitution",
      "Prototype simple",
      "Bilan de sequence",
    ],
    description:
      "Evaluation de technologie sur l'analyse, la conception et la restitution.",
    baseScores: [17.4, 14.6],
  },
};

const TERM_CONFIG = {
  [Term.TERM_1]: {
    startDate: new Date("2025-09-10T08:00:00.000Z"),
    scoreShift: 0,
  },
  [Term.TERM_2]: {
    startDate: new Date("2026-01-08T08:00:00.000Z"),
    scoreShift: 0.6,
  },
};

function clampScore(value, min, max) {
  return Math.min(max, Math.max(min, Number(value.toFixed(1))));
}

function buildEvaluationBlueprints() {
  const result = {};

  for (const [subjectName, branches] of Object.entries(BRANCHES_BY_SUBJECT)) {
    const template = SUBJECT_TEMPLATES[subjectName];
    result[subjectName] = [Term.TERM_1, Term.TERM_2].flatMap((term) =>
      template.titles.map((title, index) => {
        const maxScore = index % 4 === 2 ? 40 : 20;
        const coefficient = [1, 1, 1.5, 2, 1][index % 5];
        const baseDate = TERM_CONFIG[term].startDate;
        const scheduledAt = new Date(
          baseDate.getTime() +
            index * 9 * 24 * 60 * 60 * 1000 +
            (index % 3) * 60 * 60 * 1000,
        );
        const lisaBase =
          template.baseScores[0] +
          TERM_CONFIG[term].scoreShift +
          ((index % 4) - 1.5) * 0.8;
        const remiBase =
          template.baseScores[1] +
          TERM_CONFIG[term].scoreShift +
          ((index % 5) - 2) * 0.7;
        const scores =
          maxScore === 40
            ? [clampScore(lisaBase * 2, 7, 38), clampScore(remiBase * 2, 5, 34)]
            : [clampScore(lisaBase, 4, 20), clampScore(remiBase, 3, 20)];

        const statuses =
          subjectName === "Physique" && term === Term.TERM_1 && index === 0
            ? [EvaluationScoreStatus.ENTERED, EvaluationScoreStatus.ABSENT]
            : subjectName === "Anglais" && term === Term.TERM_1 && index === 4
              ? [EvaluationScoreStatus.ABSENT, EvaluationScoreStatus.ENTERED]
              : subjectName === "Géographie" &&
                  term === Term.TERM_1 &&
                  index === 7
                ? [EvaluationScoreStatus.EXCUSED, EvaluationScoreStatus.ENTERED]
                : subjectName === "Technologie" &&
                    term === Term.TERM_2 &&
                    index === 3
                  ? [
                      EvaluationScoreStatus.ENTERED,
                      EvaluationScoreStatus.EXCUSED,
                    ]
                  : subjectName === "Chimie" &&
                      term === Term.TERM_2 &&
                      index === 5
                    ? [
                        EvaluationScoreStatus.NOT_GRADED,
                        EvaluationScoreStatus.ENTERED,
                      ]
                    : subjectName === "Chimie" &&
                        term === Term.TERM_1 &&
                        index === 6
                      ? [
                          EvaluationScoreStatus.ENTERED,
                          EvaluationScoreStatus.NOT_GRADED,
                        ]
                      : undefined;

        return {
          branch: branches[index % branches.length],
          type: EVALUATION_TYPES[index % EVALUATION_TYPES.length].code,
          title: `${title} T${term === Term.TERM_1 ? "1" : "2"} #${index + 1}`,
          description: template.description,
          coefficient,
          maxScore,
          term,
          scheduledAt: scheduledAt.toISOString(),
          scores,
          statuses,
        };
      }),
    );
  }

  return result;
}

const EVALUATION_BLUEPRINTS = buildEvaluationBlueprints();

function buildStatus(index, explicitStatuses) {
  if (explicitStatuses?.[index]) {
    return explicitStatuses[index];
  }
  return EvaluationScoreStatus.ENTERED;
}

function studentTermReportFor(student, term) {
  const isLisa = student.lastName === "MBELE";

  if (term === Term.TERM_1) {
    return {
      status: TermReportStatus.PUBLISHED,
      councilHeldAt: new Date("2025-12-09T16:30:00.000Z"),
      publishedAt: new Date("2025-12-10T08:32:00.000Z"),
      generalAppreciation: isLisa
        ? "Trimestre serieux et applique. Les efforts sont constants dans l'ensemble."
        : "Trimestre encourageant. Il faut gagner en regularite et en precision dans le travail personnel.",
      subjects: {
        Anglais: isLisa
          ? "Bonne participation et expression ecrite soignee."
          : "Des bases presentes, mais il faut davantage s'entrainer a l'ecrit.",
        Chimie: isLisa
          ? "Bon engagement dans les activites experimentales."
          : "Resultats corrects, consignes pratiques a mieux suivre.",
        Géographie: isLisa
          ? "Travail serieux et cartes bien lues."
          : "Des connaissances a consolider sur les reperes essentiels.",
        Physique: isLisa
          ? "Tres bon investissement lors des manipulations."
          : "Une absence sur une evaluation; reprise attendue au prochain trimestre.",
        Technologie: isLisa
          ? "Presentation claire et appliquee."
          : "Bonne implication orale, poursuivre les efforts de structuration.",
      },
    };
  }

  return {
    status: TermReportStatus.PUBLISHED,
    councilHeldAt: new Date("2026-03-17T15:45:00.000Z"),
    publishedAt: new Date("2026-03-18T09:15:00.000Z"),
    generalAppreciation: isLisa
      ? "Bon deuxieme trimestre. Ensemble solide et attitude constructive."
      : "Trimestre globalement satisfaisant. Des progres visibles, a confirmer dans les disciplines scientifiques.",
    subjects: {
      Anglais: isLisa
        ? "Des resultats solides et reguliers. Maintenir les efforts en production ecrite."
        : "Bonne volonte. Plus de rigueur grammaticale est attendue.",
      Chimie: isLisa
        ? "Bonne comprehension des transformations et participation active."
        : "Des acquisitions encore fragiles, mais une implication en hausse.",
      Géographie: isLisa
        ? "Le travail est serieux, avec de bons reperes territoriaux."
        : "L'apprentissage des lecons doit etre plus regulier.",
      Physique: isLisa
        ? "Bon trimestre dans l'ensemble, manipulations bien maitrisees."
        : "Bonne reprise apres l'absence du premier trimestre.",
      Technologie: isLisa
        ? "Projet tres bien mene et presentation precise."
        : "Bon esprit de groupe et production correcte.",
    },
  };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refus de seed demo en production.");
  }

  const school = await prisma.school.findUnique({
    where: { slug: SCHOOL_SLUG },
    select: { id: true, activeSchoolYearId: true },
  });
  if (!school) {
    throw new Error(`Ecole introuvable: ${SCHOOL_SLUG}`);
  }

  const classEntity = await prisma.class.findFirst({
    where: {
      schoolId: school.id,
      name: CLASS_NAME,
      schoolYearId: school.activeSchoolYearId ?? undefined,
    },
    select: {
      id: true,
      schoolId: true,
      schoolYearId: true,
      assignments: {
        select: {
          teacherUserId: true,
          subjectId: true,
          subject: { select: { id: true, name: true } },
        },
      },
      enrollments: {
        where: { status: "ACTIVE" },
        select: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
      },
    },
  });
  if (!classEntity) {
    throw new Error(`Classe introuvable: ${CLASS_NAME}`);
  }

  if (classEntity.enrollments.length === 0) {
    throw new Error(`Aucun eleve actif dans ${CLASS_NAME}`);
  }

  for (const type of EVALUATION_TYPES) {
    await prisma.evaluationType.upsert({
      where: { schoolId_code: { schoolId: school.id, code: type.code } },
      update: { label: type.label },
      create: {
        schoolId: school.id,
        code: type.code,
        label: type.label,
        isDefault: true,
      },
    });
  }

  const subjectByName = new Map(
    classEntity.assignments.map((assignment) => [
      assignment.subject.name,
      assignment,
    ]),
  );

  const branchIds = new Map();
  for (const [subjectName, branches] of Object.entries(BRANCHES_BY_SUBJECT)) {
    const assignment = subjectByName.get(subjectName);
    if (!assignment) {
      continue;
    }

    for (const branchName of branches) {
      const branch = await prisma.subjectBranch.upsert({
        where: {
          subjectId_name: {
            subjectId: assignment.subjectId,
            name: branchName,
          },
        },
        update: {},
        create: {
          schoolId: school.id,
          subjectId: assignment.subjectId,
          name: branchName,
        },
      });
      branchIds.set(`${subjectName}:${branchName}`, branch.id);
    }
  }

  const demoEvaluations = await prisma.evaluation.findMany({
    where: {
      schoolId: school.id,
      classId: classEntity.id,
      title: { startsWith: TITLE_PREFIX },
    },
    select: { id: true },
  });
  if (demoEvaluations.length > 0) {
    await prisma.evaluation.deleteMany({
      where: { id: { in: demoEvaluations.map((evaluation) => evaluation.id) } },
    });
  }

  const evaluationTypeByCode = new Map(
    (
      await prisma.evaluationType.findMany({
        where: { schoolId: school.id },
        select: { id: true, code: true },
      })
    ).map((entry) => [entry.code, entry.id]),
  );

  const students = classEntity.enrollments.map(
    (enrollment) => enrollment.student,
  );

  for (const [subjectName, evaluations] of Object.entries(
    EVALUATION_BLUEPRINTS,
  )) {
    const assignment = subjectByName.get(subjectName);
    if (!assignment) {
      continue;
    }

    for (const blueprint of evaluations) {
      const typeId =
        evaluationTypeByCode.get(blueprint.type) ??
        evaluationTypeByCode.get(blueprint.fallbackType ?? "") ??
        evaluationTypeByCode.get("DEVOIR");

      const scheduledAt = new Date(blueprint.scheduledAt);
      const evaluation = await prisma.evaluation.create({
        data: {
          schoolId: school.id,
          schoolYearId: classEntity.schoolYearId,
          classId: classEntity.id,
          subjectId: assignment.subjectId,
          subjectBranchId:
            branchIds.get(`${subjectName}:${blueprint.branch}`) ?? null,
          evaluationTypeId: typeId,
          authorUserId: assignment.teacherUserId,
          title: `${TITLE_PREFIX} ${blueprint.title}`,
          description: blueprint.description,
          coefficient: blueprint.coefficient,
          maxScore: blueprint.maxScore,
          term: blueprint.term,
          status: EvaluationStatus.PUBLISHED,
          scheduledAt,
          publishedAt: new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000),
          createdAt: scheduledAt,
          scores: {
            create: students.map((student, index) => {
              const status = buildStatus(index, blueprint.statuses);
              const score = blueprint.scores[index];
              return {
                studentId: student.id,
                status,
                score: status === EvaluationScoreStatus.ENTERED ? score : null,
                comment:
                  status === EvaluationScoreStatus.ABSENT
                    ? "Absence signalee"
                    : status === EvaluationScoreStatus.EXCUSED
                      ? "Dispense pour cette evaluation"
                      : status === EvaluationScoreStatus.NOT_GRADED
                        ? "Evaluation non rendue ou non notee"
                        : null,
                createdAt: scheduledAt,
              };
            }),
          },
        },
      });

      await prisma.evaluationAuditLog.create({
        data: {
          schoolId: school.id,
          evaluationId: evaluation.id,
          actorUserId: assignment.teacherUserId,
          action: "PUBLISHED",
          payloadJson: {
            source: "seed-6ec-evaluations-demo",
            subjectName,
            branch: blueprint.branch,
          },
          createdAt: new Date(scheduledAt.getTime() + 2 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  for (const student of students) {
    for (const term of [Term.TERM_1, Term.TERM_2]) {
      const reportData = studentTermReportFor(student, term);
      const report = await prisma.studentTermReport.upsert({
        where: {
          schoolYearId_classId_studentId_term: {
            schoolYearId: classEntity.schoolYearId,
            classId: classEntity.id,
            studentId: student.id,
            term,
          },
        },
        update: {
          status: reportData.status,
          councilHeldAt: reportData.councilHeldAt,
          generalAppreciation: reportData.generalAppreciation,
          publishedAt: reportData.publishedAt,
          updatedByUserId:
            classEntity.assignments[0]?.teacherUserId ??
            classEntity.assignments.at(-1)?.teacherUserId,
          subjectEntries: {
            deleteMany: {},
            create: classEntity.assignments.map((assignment) => ({
              schoolId: school.id,
              subjectId: assignment.subjectId,
              appreciation: reportData.subjects[assignment.subject.name] ?? "",
              updatedByUserId: assignment.teacherUserId,
            })),
          },
        },
        create: {
          schoolId: school.id,
          schoolYearId: classEntity.schoolYearId,
          classId: classEntity.id,
          studentId: student.id,
          term,
          status: reportData.status,
          councilHeldAt: reportData.councilHeldAt,
          generalAppreciation: reportData.generalAppreciation,
          publishedAt: reportData.publishedAt,
          updatedByUserId:
            classEntity.assignments[0]?.teacherUserId ??
            classEntity.assignments.at(-1)?.teacherUserId,
          subjectEntries: {
            create: classEntity.assignments.map((assignment) => ({
              schoolId: school.id,
              subjectId: assignment.subjectId,
              appreciation: reportData.subjects[assignment.subject.name] ?? "",
              updatedByUserId: assignment.teacherUserId,
            })),
          },
        },
      });

      await prisma.studentTermReport.update({
        where: { id: report.id },
        data: {
          createdAt: reportData.councilHeldAt,
          updatedAt: reportData.publishedAt,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        schoolSlug: SCHOOL_SLUG,
        className: CLASS_NAME,
        students: students.map(
          (student) => `${student.lastName} ${student.firstName}`,
        ),
        seededSubjects: Object.keys(EVALUATION_BLUEPRINTS),
      },
      null,
      2,
    ),
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
