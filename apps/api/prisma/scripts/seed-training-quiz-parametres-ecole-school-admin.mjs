import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/settings";

const CHAPTER = {
  role: "SCHOOL_ADMIN",
  moduleKey: "parametres-ecole",
  order: 2,
  icon: "Settings",
  colorFrom: "#64748B",
  colorTo: "#334155",
  titleFr: "Paramètres de l'école",
  titleEn: "School settings",
  descriptionFr:
    "Apprenez à activer les niveaux nationaux et à ordonner les niveaux propres à votre école.",
  descriptionEn:
    "Learn how to activate national levels and order your school's own levels.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Que gère l'onglet \"Niveaux\" de Paramètres de l'école ?",
    textEn: 'What does the "Levels" tab of School Settings manage?',
    hintFr: "Chaque ligne du tableau représente un niveau scolaire.",
    hintEn: "Each row of the table represents an academic level.",
    explanationFr:
      "L'activation et l'ordre des niveaux scolaires utilisés par votre école.",
    explanationEn:
      "The activation and ordering of the academic levels used by your school.",
    options: [
      {
        textFr: "L'activation et l'ordre des niveaux scolaires",
        textEn: "The activation and ordering of academic levels",
        isCorrect: true,
      },
      {
        textFr: "Le logo et le nom de l'école",
        textEn: "The school's logo and name",
        isCorrect: false,
      },
      {
        textFr: "Les moyens de paiement acceptés",
        textEn: "The accepted payment methods",
        isCorrect: false,
      },
      {
        textFr: "Les identifiants de connexion",
        textEn: "Login credentials",
        isCorrect: false,
      },
    ],
  },
  {
    order: 2,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      'Quels sont les deux types de niveaux affichés dans la colonne "Type" ?',
    textEn: 'What are the two level types shown in the "Type" column?',
    hintFr: "L'un vient d'un curriculum partagé, l'autre a été créé pour vous.",
    hintEn:
      "One comes from a shared curriculum, the other was created for you.",
    explanationFr: "National, ou propre à l'école.",
    explanationEn: "National, or the school's own.",
    options: [
      {
        textFr: "National / Propre à l'école",
        textEn: "National / School's own",
        isCorrect: true,
      },
      {
        textFr: "Public / Privé",
        textEn: "Public / Private",
        isCorrect: false,
      },
      {
        textFr: "Actif / Archivé",
        textEn: "Active / Archived",
        isCorrect: false,
      },
      {
        textFr: "Primaire / Secondaire",
        textEn: "Primary / Secondary",
        isCorrect: false,
      },
    ],
  },
  {
    order: 3,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Vous pouvez activer ou désactiver un niveau national directement depuis cette page.",
    textEn:
      "You can activate or deactivate a national level directly from this page.",
    hintFr:
      "Une case à cocher existe dans la colonne Actif pour ce type de niveau.",
    hintEn: "A checkbox exists in the Active column for this level type.",
    explanationFr:
      "Vrai : une case à cocher permet de basculer un niveau national actif/inactif.",
    explanationEn: "True: a checkbox toggles a national level active/inactive.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 4,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Vous pouvez désactiver un niveau propre à l'école (non national).",
    textEn: "You can deactivate a school's own (non-national) level.",
    hintFr: "Un badge remplace la case à cocher pour ce type de niveau.",
    hintEn: "A badge replaces the checkbox for this level type.",
    explanationFr:
      "Faux : un niveau propre à l'école reste toujours actif, un badge l'indique.",
    explanationEn:
      "False: a school's own level always stays active, shown by a badge.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 5,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Pour un niveau propre à l'école, quel champ pouvez-vous modifier dans le tableau ?",
    textEn: "For a school's own level, which field can you edit in the table?",
    hintFr: "Il s'agit d'un champ numérique suivi d'un bouton Enregistrer.",
    hintEn: "It's a numeric field followed by a Save button.",
    explanationFr: "Son ordre d'affichage.",
    explanationEn: "Its display order.",
    options: [
      {
        textFr: "Son ordre d'affichage",
        textEn: "Its display order",
        isCorrect: true,
      },
      { textFr: "Son code", textEn: "Its code", isCorrect: false },
      {
        textFr: "Son type (national/propre)",
        textEn: "Its type (national/own)",
        isCorrect: false,
      },
      {
        textFr: "L'école à laquelle il appartient",
        textEn: "The school it belongs to",
        isCorrect: false,
      },
    ],
  },
  {
    order: 6,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Ouvrez la page et désactivez un niveau national actif : quel contrôle utilisez-vous ?",
    textEn:
      "Open the page and deactivate an active national level: which control do you use?",
    hintFr: "Il se trouve dans la dernière colonne du tableau.",
    hintEn: "It's in the table's last column.",
    explanationFr: "La case à cocher de la colonne Actif.",
    explanationEn: "The checkbox in the Active column.",
    options: [
      {
        textFr: "La case à cocher de la colonne Actif",
        textEn: "The checkbox in the Active column",
        isCorrect: true,
      },
      {
        textFr: "Un bouton Supprimer",
        textEn: "A Delete button",
        isCorrect: false,
      },
      {
        textFr: "Le champ d'ordre",
        textEn: "The order field",
        isCorrect: false,
      },
      {
        textFr: "Un menu déroulant Type",
        textEn: "A Type dropdown",
        isCorrect: false,
      },
    ],
  },
  {
    order: 7,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Modifiez l'ordre d'un niveau propre à l'école et cliquez sur Enregistrer : la nouvelle valeur reste affichée après l'opération.",
    textEn:
      "Edit a school's own level's order and click Save: the new value stays displayed afterwards.",
    hintFr: "Le tableau se retrie selon les valeurs d'ordre à jour.",
    hintEn: "The table re-sorts using the up-to-date order values.",
    explanationFr:
      "Vrai : l'ordre est enregistré côté serveur et le tableau se met à jour.",
    explanationEn:
      "True: the order is saved server-side and the table updates.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 8,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Pourquoi un niveau national peut-il être désactivé alors qu'un niveau propre à l'école ne le peut jamais ?",
    textEn:
      "Why can a national level be deactivated while a school's own level never can?",
    hintFr: "Pensez à qui a créé chaque type de niveau, et pourquoi.",
    hintEn: "Think about who created each level type, and why.",
    explanationFr:
      "Un niveau national est partagé par toutes les écoles d'un même curriculum et peut ne pas s'appliquer à la vôtre ; un niveau propre a été créé spécifiquement pour votre école, donc jugé toujours pertinent.",
    explanationEn:
      "A national level is shared across every school on the same curriculum and may not apply to yours; a school's own level was created specifically for it, so it's always considered relevant.",
    options: [
      {
        textFr:
          "Le niveau national est partagé et peut ne pas s'appliquer à votre école",
        textEn: "The national level is shared and may not apply to your school",
        isCorrect: true,
      },
      {
        textFr: "C'est une limitation technique sans raison métier",
        textEn: "It's a technical limitation with no business reason",
        isCorrect: false,
      },
      {
        textFr: "Les niveaux propres sont toujours désactivés par défaut",
        textEn: "Own levels are always disabled by default",
        isCorrect: false,
      },
      {
        textFr: "Seul un niveau national peut être supprimé",
        textEn: "Only a national level can be deleted",
        isCorrect: false,
      },
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
