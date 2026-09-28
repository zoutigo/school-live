import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/subjects";

const CHAPTER = {
  role: "SCHOOL_ADMIN",
  moduleKey: "matieres",
  order: 4,
  icon: "BookOpen",
  colorFrom: "#D97706",
  colorTo: "#B45309",
  titleFr: "Matières",
  titleEn: "Subjects",
  descriptionFr:
    "Apprenez à gérer le catalogue de matières de votre école, ses sous-branches, ses affectations et ses types d'évaluation.",
  descriptionEn:
    "Learn how to manage your school's subject catalog, its sub-branches, its assignments and its evaluation types.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quels onglets existent dans le module Matières, en dehors de l'aide ? (plusieurs réponses)",
    textEn:
      "Which tabs exist in the Subjects module, besides help? (select all that apply)",
    hintFr: "Il y en a exactement trois.",
    hintEn: "There are exactly three.",
    explanationFr: "Catalogue, Affectations, Types d'évaluation.",
    explanationEn: "Catalog, Assignments, Evaluation types.",
    options: [
      { textFr: "Catalogue", textEn: "Catalog", isCorrect: true },
      { textFr: "Affectations", textEn: "Assignments", isCorrect: true },
      {
        textFr: "Types d'évaluation",
        textEn: "Evaluation types",
        isCorrect: true,
      },
      { textFr: "Curriculums", textEn: "Curriculums", isCorrect: false },
    ],
  },
  {
    order: 2,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Une matière de votre catalogue peut avoir plusieurs sous-branches.",
    textEn: "A subject in your catalog can have several sub-branches.",
    hintFr: "Pensez aux séries d'un même tronc commun, ex. Sciences.",
    hintEn: "Think of tracks sharing a common trunk, e.g. Sciences.",
    explanationFr:
      "Vrai : chaque matière peut se décliner en plusieurs sous-branches.",
    explanationEn: "True: each subject can be split into several sub-branches.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 3,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Combien de champs devez-vous renseigner pour ajouter une nouvelle matière au catalogue ?",
    textEn:
      "How many fields must you fill in to add a new subject to the catalog?",
    hintFr: "Un seul champ texte suffit, suivi du bouton Ajouter.",
    hintEn: "A single text field is enough, followed by the Add button.",
    explanationFr: "Un seul : son nom.",
    explanationEn: "Just one: its name.",
    options: [
      {
        textFr: "Un seul (son nom)",
        textEn: "Just one (its name)",
        isCorrect: true,
      },
      {
        textFr: "Trois (nom, code et curriculum)",
        textEn: "Three (name, code and curriculum)",
        isCorrect: false,
      },
      {
        textFr: "Deux (nom et sous-branche)",
        textEn: "Two (name and sub-branch)",
        isCorrect: false,
      },
      {
        textFr: "Aucun, elle se crée automatiquement",
        textEn: "None, it's created automatically",
        isCorrect: false,
      },
    ],
  },
  {
    order: 4,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Que fait-on dans l'onglet Affectations ?",
    textEn: "What do you do in the Assignments tab?",
    hintFr:
      "On y relie trois éléments : une classe, une matière et une personne.",
    hintEn: "It links three things: a class, a subject and a person.",
    explanationFr:
      "On assigne un enseignant à une matière pour une classe et une année.",
    explanationEn: "You assign a teacher to a subject for a class and a year.",
    options: [
      {
        textFr: "Assigner un enseignant à une matière pour une classe",
        textEn: "Assign a teacher to a subject for a class",
        isCorrect: true,
      },
      {
        textFr: "Payer les enseignants",
        textEn: "Pay teachers",
        isCorrect: false,
      },
      {
        textFr: "Créer des salles de classe",
        textEn: "Create classrooms",
        isCorrect: false,
      },
      {
        textFr: "Inscrire de nouveaux élèves",
        textEn: "Enroll new students",
        isCorrect: false,
      },
    ],
  },
  {
    order: 5,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Que définit un type d'évaluation (onglet dédié) ?",
    textEn: "What does an evaluation type (its dedicated tab) define?",
    hintFr: "Deux champs le décrivent : un code court et un libellé.",
    hintEn: "Two fields describe it: a short code and a label.",
    explanationFr:
      'Un code et un libellé (ex. "DS" pour Devoir surveillé) utilisés lors de la saisie des notes.',
    explanationEn:
      'A code and a label (e.g. "DS" for a supervised test) used when entering grades.',
    options: [
      {
        textFr: "Un code et un libellé pour catégoriser une évaluation",
        textEn: "A code and a label to categorize an evaluation",
        isCorrect: true,
      },
      {
        textFr: "Le tarif des cours particuliers",
        textEn: "The price of private tutoring",
        isCorrect: false,
      },
      {
        textFr: "La salle utilisée pour l'examen",
        textEn: "The room used for the exam",
        isCorrect: false,
      },
      {
        textFr: "La liste des surveillants disponibles",
        textEn: "The list of available supervisors",
        isCorrect: false,
      },
    ],
  },
  {
    order: 6,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Il existe des types d'évaluation par défaut, en plus de ceux que vous créez vous-même.",
    textEn:
      "There are default evaluation types, in addition to the ones you create yourself.",
    hintFr: 'Une colonne "Origine" distingue ces deux provenances.',
    hintEn: 'An "Origin" column distinguishes these two sources.',
    explanationFr:
      'Vrai : l\'origine peut être "par défaut" (système) ou "personnalisé" (école).',
    explanationEn:
      'True: the origin can be "default" (system) or "custom" (school).',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 7,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Une matière peut être supprimée sans confirmation.",
    textEn: "A subject can be deleted without confirmation.",
    hintFr: "Comme pour les classes, la suppression est sensible.",
    hintEn: "Like classes, deletion is a sensitive action.",
    explanationFr:
      "Faux : une confirmation explicite est demandée avant suppression.",
    explanationEn:
      "False: an explicit confirmation is required before deleting.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 8,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Le catalogue de l'école affiche-t-il le nombre d'affectations par matière ?",
    textEn:
      "Does the school catalog show the number of assignments per subject?",
    hintFr: "Une colonne dédiée du tableau du catalogue le précise.",
    hintEn: "A dedicated column of the catalog table shows it.",
    explanationFr:
      'Oui, une colonne "Affectations" l\'indique pour chaque matière.',
    explanationEn: 'Yes, an "Assignments" column shows it for each subject.',
    options: [
      { textFr: "Oui", textEn: "Yes", isCorrect: true },
      { textFr: "Non", textEn: "No", isCorrect: false },
    ],
  },
  {
    order: 9,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Dans l'onglet Catalogue, ajoutez une matière sans sous-branche : combien de sous-branches possède-t-elle ensuite ?",
    textEn:
      "In the Catalog tab, add a subject with no sub-branch: how many sub-branches does it have afterwards?",
    hintFr: "Les sous-branches sont facultatives, pas obligatoires.",
    hintEn: "Sub-branches are optional, not required.",
    explanationFr:
      "Zéro : les sous-branches sont facultatives, une matière peut n'en avoir aucune.",
    explanationEn: "Zero: sub-branches are optional, a subject can have none.",
    options: [
      { textFr: "Zéro", textEn: "Zero", isCorrect: true },
      { textFr: "Une par défaut", textEn: "One by default", isCorrect: false },
      { textFr: "Trois", textEn: "Three", isCorrect: false },
      {
        textFr: "L'ajout est refusé sans sous-branche",
        textEn: "The addition is refused without a sub-branch",
        isCorrect: false,
      },
    ],
  },
  {
    order: 10,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Ouvrez Affectations et essayez d'assigner un enseignant sans choisir de classe : que se passe-t-il ?",
    textEn:
      "Open Assignments and try assigning a teacher without picking a class: what happens?",
    hintFr: "Classe, matière et enseignant sont les trois champs requis.",
    hintEn: "Class, subject and teacher are the three required fields.",
    explanationFr:
      "L'affectation est bloquée tant que les trois champs ne sont pas remplis.",
    explanationEn:
      "The assignment is blocked until all three fields are filled in.",
    options: [
      {
        textFr: "L'affectation est bloquée",
        textEn: "The assignment is blocked",
        isCorrect: true,
      },
      {
        textFr: "Une classe par défaut est choisie",
        textEn: "A default class is picked",
        isCorrect: false,
      },
      {
        textFr: "L'enseignant est affecté à toutes les classes",
        textEn: "The teacher is assigned to every class",
        isCorrect: false,
      },
      {
        textFr: "Cela crée une nouvelle matière",
        textEn: "It creates a new subject",
        isCorrect: false,
      },
    ],
  },
  {
    order: 11,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Créez un type d'évaluation personnalisé avec le même code qu'un type par défaut : que voyez-vous dans la colonne Origine ?",
    textEn:
      "Create a custom evaluation type with the same code as a default one: what do you see in the Origin column?",
    hintFr: "Le code n'est pas ce qui distingue les deux origines.",
    hintEn: "The code is not what distinguishes the two origins.",
    explanationFr:
      '"Personnalisé", car c\'est vous qui venez de le créer, indépendamment du code choisi.',
    explanationEn:
      '"Custom", because you just created it, regardless of the chosen code.',
    options: [
      { textFr: "Personnalisé", textEn: "Custom", isCorrect: true },
      { textFr: "Par défaut", textEn: "Default", isCorrect: false },
      { textFr: "National", textEn: "National", isCorrect: false },
      { textFr: "Archivé", textEn: "Archived", isCorrect: false },
    ],
  },
  {
    order: 12,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Renommez une matière de votre catalogue : les affectations déjà réalisées sur cette matière restent valides.",
    textEn:
      "Rename a subject in your catalog: existing assignments on that subject stay valid.",
    hintFr: "Le renommage change le libellé, pas l'identité de la matière.",
    hintEn: "Renaming changes the label, not the subject's identity.",
    explanationFr:
      "Vrai : renommer ne fait que changer le libellé affiché, les liens existants sont conservés.",
    explanationEn:
      "True: renaming only changes the displayed label, existing links are kept.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 13,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Pourquoi vérifier le nombre d'affectations d'une matière avant de la supprimer ?",
    textEn: "Why check a subject's assignment count before deleting it?",
    hintFr:
      "Chaque affectation relie un enseignant à cette matière pour une classe.",
    hintEn: "Each assignment links a teacher to this subject for a class.",
    explanationFr:
      "Parce que supprimer une matière encore affectée retire le lien entre les enseignants concernés et cette matière pour l'année en cours.",
    explanationEn:
      "Because deleting a subject still assigned removes the link between the concerned teachers and this subject for the current year.",
    options: [
      {
        textFr:
          "La suppression retire le lien enseignant-matière pour l'année en cours",
        textEn:
          "Deletion removes the teacher-subject link for the current year",
        isCorrect: true,
      },
      {
        textFr:
          "Le nombre d'affectations n'a aucun rapport avec la suppression",
        textEn: "The assignment count has nothing to do with deletion",
        isCorrect: false,
      },
      {
        textFr:
          "Une matière affectée ne peut techniquement jamais être supprimée",
        textEn: "An assigned subject can technically never be deleted",
        isCorrect: false,
      },
      {
        textFr: "Cela change automatiquement le nom de la matière",
        textEn: "It automatically changes the subject's name",
        isCorrect: false,
      },
    ],
  },
  {
    order: 14,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Le nombre d'affectations affiché dans le catalogue peut vous aider à repérer une matière jamais utilisée par un enseignant.",
    textEn:
      "The assignment count shown in the catalog can help you spot a subject never used by a teacher.",
    hintFr:
      "Une matière avec zéro affectation n'a encore aucun enseignant en charge.",
    hintEn: "A subject with zero assignments has no teacher in charge yet.",
    explanationFr:
      "Vrai : une matière à zéro affectation signale qu'aucun enseignant n'y est encore rattaché.",
    explanationEn:
      "True: a subject at zero assignments signals no teacher is attached to it yet.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
];

async function main() {
  const chapter = await prisma.quizChapter.upsert({
    where: {
      role_moduleKey: { role: CHAPTER.role, moduleKey: CHAPTER.moduleKey },
    },
    create: CHAPTER,
    update: CHAPTER,
  });

  for (const question of QUESTIONS) {
    const savedQuestion = await prisma.quizQuestion.upsert({
      where: {
        chapterId_order: { chapterId: chapter.id, order: question.order },
      },
      create: {
        chapterId: chapter.id,
        order: question.order,
        type: question.type,
        stage: question.stage,
        textFr: question.textFr,
        textEn: question.textEn,
        hintFr: question.hintFr,
        hintEn: question.hintEn,
        explanationFr: question.explanationFr,
        explanationEn: question.explanationEn,
        imageUrl: question.image,
        deepLinkRoute: question.deepLinkRoute,
      },
      update: {
        type: question.type,
        stage: question.stage,
        textFr: question.textFr,
        textEn: question.textEn,
        hintFr: question.hintFr,
        hintEn: question.hintEn,
        explanationFr: question.explanationFr,
        explanationEn: question.explanationEn,
        imageUrl: question.image,
        deepLinkRoute: question.deepLinkRoute,
        isActive: true,
      },
    });

    for (const [index, option] of question.options.entries()) {
      await prisma.quizAnswerOption.upsert({
        where: {
          questionId_order: { questionId: savedQuestion.id, order: index + 1 },
        },
        create: {
          questionId: savedQuestion.id,
          order: index + 1,
          textFr: option.textFr,
          textEn: option.textEn,
          isCorrect: option.isCorrect,
        },
        update: {
          textFr: option.textFr,
          textEn: option.textEn,
          isCorrect: option.isCorrect,
        },
      });
    }
  }

  console.log(
    `Training quiz seeded: chapter "${chapter.titleFr}" (${QUESTIONS.length} questions) for role ${CHAPTER.role}.`,
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
