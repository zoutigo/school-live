import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/finance-reinscription-deadlines";

const CHAPTER = {
  role: "SCHOOL_ADMIN",
  moduleKey: "delais-reinscription",
  order: 8,
  icon: "CalendarClock",
  colorFrom: "#EA580C",
  colorTo: "#C2410C",
  titleFr: "Délais de réinscription",
  titleEn: "Re-enrollment deadlines",
  descriptionFr:
    "Apprenez à définir, par niveau et par année scolaire, la date limite de réinscription affichée aux parents.",
  descriptionEn:
    "Learn how to set, per level and school year, the re-enrollment deadline shown to parents.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quelles informations définissez-vous pour une date limite de réinscription ? (plusieurs réponses)",
    textEn:
      "Which information do you set for a re-enrollment deadline? (select all that apply)",
    hintFr: "Une date limite est toujours propre à un couple précis.",
    hintEn: "A deadline is always specific to one exact pair.",
    explanationFr: "L'année scolaire, le niveau, et la date limite elle-même.",
    explanationEn: "The school year, the level, and the deadline itself.",
    options: [
      { textFr: "Année scolaire", textEn: "School year", isCorrect: true },
      { textFr: "Niveau", textEn: "Level", isCorrect: true },
      { textFr: "Date limite", textEn: "Deadline", isCorrect: true },
      {
        textFr: "Montant des frais de scolarité",
        textEn: "Tuition fee amount",
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
    textFr: "À qui cette date limite est-elle affichée ?",
    textEn: "Who is this deadline shown to?",
    hintFr: "C'est un compte à rebours vu depuis un autre espace que le vôtre.",
    hintEn: "It's a countdown seen from a space other than yours.",
    explanationFr: "Aux parents, sur la carte de réinscription de leur espace.",
    explanationEn: "To parents, on the re-enrollment card of their space.",
    options: [
      {
        textFr: "Aux parents, sur leur carte de réinscription",
        textEn: "To parents, on their re-enrollment card",
        isCorrect: true,
      },
      {
        textFr: "Aux enseignants uniquement",
        textEn: "To teachers only",
        isCorrect: false,
      },
      {
        textFr: "À personne, c'est un usage interne",
        textEn: "To no one, it's internal use only",
        isCorrect: false,
      },
      {
        textFr: "Aux fournisseurs de la cantine",
        textEn: "To the canteen suppliers",
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
      "Ces dates limites sont reprises automatiquement lors de la création de l'année scolaire suivante.",
    textEn:
      "These deadlines are automatically carried over when the next school year is created.",
    hintFr: "Elles sont décalées d'un an, pas recréées de zéro.",
    hintEn: "They're shifted by one year, not recreated from scratch.",
    explanationFr:
      "Vrai : elles sont copiées avec un an de décalage, il suffit ensuite de les ajuster.",
    explanationEn:
      "True: they're copied with a one-year shift, you then just need to adjust them.",
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
    textFr:
      "Modifier cette date limite change aussi le seuil de paiement requis pour réinscrire un élève.",
    textEn:
      "Changing this deadline also changes the payment threshold required to re-enroll a student.",
    hintFr:
      "Cette date n'est qu'une information de délai, pas une règle financière.",
    hintEn:
      "This date is only a piece of deadline information, not a financial rule.",
    explanationFr:
      "Faux : elle n'affecte que l'information de délai communiquée, pas le seuil de paiement.",
    explanationEn:
      "False: it only affects the communicated deadline information, not the payment threshold.",
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
    textFr: "Que voit un parent pour un niveau sans date limite définie ?",
    textEn: "What does a parent see for a level with no deadline defined?",
    hintFr: "Sans donnée, il n'y a rien à compter.",
    hintEn: "With no data, there's nothing to count down.",
    explanationFr: "Aucun compte à rebours, tant qu'aucune date n'est définie.",
    explanationEn: "No countdown, until a date is defined.",
    options: [
      {
        textFr: "Aucun compte à rebours",
        textEn: "No countdown",
        isCorrect: true,
      },
      {
        textFr: "Un compte à rebours par défaut de 30 jours",
        textEn: "A default 30-day countdown",
        isCorrect: false,
      },
      {
        textFr: "Un message d'erreur bloquant",
        textEn: "A blocking error message",
        isCorrect: false,
      },
      {
        textFr: "La date de l'année précédente",
        textEn: "Last year's date",
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
    textFr: "Supprimez une date limite existante : quel bouton utilisez-vous ?",
    textEn: "Delete an existing deadline: which button do you use?",
    hintFr: "Il se trouve sur la fiche de la date limite concernée.",
    hintEn: "It's on the deadline record itself.",
    explanationFr: "Le bouton Supprimer, sur la fiche concernée.",
    explanationEn: "The Delete button, on the corresponding record.",
    options: [
      { textFr: "Supprimer", textEn: "Delete", isCorrect: true },
      { textFr: "Archiver", textEn: "Archive", isCorrect: false },
      { textFr: "Désactiver", textEn: "Disable", isCorrect: false },
      { textFr: "Exporter", textEn: "Export", isCorrect: false },
    ],
  },
  {
    order: 7,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Après avoir supprimé une date limite, le parent revoit un compte à rebours dès la page suivante.",
    textEn:
      "After deleting a deadline, the parent sees a countdown again on the next page.",
    hintFr: "Sans donnée en base, il n'y a rien à afficher.",
    hintEn: "With no data stored, there's nothing to show.",
    explanationFr:
      "Faux : il ne revoit un compte à rebours que lorsqu'une nouvelle date est définie.",
    explanationEn:
      "False: they only see a countdown again once a new date is defined.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 8,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Pourquoi vaut-il mieux ajuster les dates reprises automatiquement plutôt que les ressaisir de zéro chaque année ?",
    textEn:
      "Why is it better to adjust the automatically carried-over dates rather than re-entering them from scratch each year?",
    hintFr:
      "Elles sont déjà décalées d'un an au moment de la création de l'année.",
    hintEn: "They're already shifted by one year when the year is created.",
    explanationFr:
      "Parce qu'elles sont déjà présentes avec un décalage d'un an cohérent : les ajuster évite les oublis niveau par niveau et gagne du temps.",
    explanationEn:
      "Because they're already present with a consistent one-year shift: adjusting them avoids per-level omissions and saves time.",
    options: [
      {
        textFr:
          "Elles existent déjà décalées d'un an, ajuster évite les oublis",
        textEn:
          "They already exist shifted by one year, adjusting avoids omissions",
        isCorrect: true,
      },
      {
        textFr: "La ressaisie manuelle est obligatoire de toute façon",
        textEn: "Manual re-entry is mandatory anyway",
        isCorrect: false,
      },
      {
        textFr: "Cela change le seuil de paiement requis",
        textEn: "It changes the required payment threshold",
        isCorrect: false,
      },
      {
        textFr: "Cela n'a aucune importance",
        textEn: "It doesn't matter at all",
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
