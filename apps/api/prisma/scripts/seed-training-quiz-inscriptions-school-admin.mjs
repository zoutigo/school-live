import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/enrollments";

const CHAPTER = {
  role: "SCHOOL_ADMIN",
  moduleKey: "inscriptions",
  order: 6,
  icon: "UserPlus",
  colorFrom: "#E11D48",
  colorTo: "#9F1239",
  titleFr: "Inscriptions",
  titleEn: "Enrollments",
  descriptionFr:
    "Apprenez à créer un nouvel élève sans historique et à l'affecter à sa classe définitive une fois réinscrit.",
  descriptionEn:
    "Learn how to create a new student with no history and assign them to their final class once re-enrolled.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quelles informations sont obligatoires pour créer un nouvel élève ? (plusieurs réponses)",
    textEn:
      "Which information is required to create a new student? (select all that apply)",
    hintFr: "La date de naissance et la filière sont, elles, facultatives.",
    hintEn: "Date of birth and track are, however, optional.",
    explanationFr: "Prénom, nom et niveau.",
    explanationEn: "First name, last name and level.",
    options: [
      { textFr: "Prénom", textEn: "First name", isCorrect: true },
      { textFr: "Nom", textEn: "Last name", isCorrect: true },
      { textFr: "Niveau", textEn: "Level", isCorrect: true },
      {
        textFr: "Date de naissance",
        textEn: "Date of birth",
        isCorrect: false,
      },
    ],
  },
  {
    order: 2,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Un élève nouvellement créé se voit attribuer une classe immédiatement.",
    textEn: "A newly created student is assigned a class immediately.",
    hintFr: "Il rejoint d'abord un pool en attente.",
    hintEn: "It first joins a waiting pool.",
    explanationFr:
      "Faux : il rejoint le pool en attente d'affectation de classe dès que la 1ère échéance est payée.",
    explanationEn:
      "False: it joins the class-assignment waiting pool once the first installment is paid.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 3,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quelle condition fait entrer un élève dans le pool en attente d'affectation ?",
    textEn: "What condition makes a student enter the assignment-waiting pool?",
    hintFr: "C'est un événement financier, pas une action manuelle de l'admin.",
    hintEn: "It's a financial event, not a manual admin action.",
    explanationFr:
      "Le paiement de la première échéance (admission ou réinscription).",
    explanationEn: "Paying the first installment (admission or re-enrollment).",
    options: [
      {
        textFr: "Le paiement de la première échéance",
        textEn: "Paying the first installment",
        isCorrect: true,
      },
      {
        textFr: "La signature d'un contrat papier",
        textEn: "Signing a paper contract",
        isCorrect: false,
      },
      {
        textFr: "Le premier jour de classe",
        textEn: "The first day of class",
        isCorrect: false,
      },
      {
        textFr: "L'ajout d'une photo de profil",
        textEn: "Adding a profile photo",
        isCorrect: false,
      },
    ],
  },
  {
    order: 4,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Si un élève créé n'a jamais payé sa première échéance, il n'apparaît nulle part et ne nécessite aucune action.",
    textEn:
      "If a created student never pays their first installment, they don't show up anywhere and need no action.",
    hintFr: "L'élève reste hors du pool tant que ce paiement n'est pas fait.",
    hintEn: "The student stays outside the pool until that payment is made.",
    explanationFr:
      "Vrai : sans ce paiement, il n'entre jamais dans la liste d'attente d'affectation.",
    explanationEn:
      "True: without that payment, it never enters the assignment waiting list.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 5,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quelle année scolaire est utilisée par défaut à la création d'un élève ?",
    textEn: "Which school year is used by default when creating a student?",
    hintFr: "Le champ est facultatif et une valeur pré-choisie existe.",
    hintEn: "The field is optional and a pre-picked value exists.",
    explanationFr: "L'année scolaire active.",
    explanationEn: "The active school year.",
    options: [
      {
        textFr: "L'année scolaire active",
        textEn: "The active school year",
        isCorrect: true,
      },
      {
        textFr: "La première année créée dans l'école",
        textEn: "The first year ever created at the school",
        isCorrect: false,
      },
      {
        textFr: "Aucune, elle doit être choisie",
        textEn: "None, it must be chosen",
        isCorrect: false,
      },
      {
        textFr: "L'année suivante",
        textEn: "Next year",
        isCorrect: false,
      },
    ],
  },
  {
    order: 6,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Qui affecte finalement l'élève en attente à une classe ?",
    textEn: "Who finally assigns the waiting student to a class?",
    hintFr:
      "C'est une opération réalisée manuellement, filtrée par niveau et année.",
    hintEn: "This is done manually, filtered by level and year.",
    explanationFr:
      "Le responsable pédagogique / l'administrateur, depuis la liste d'attente.",
    explanationEn:
      "The school admin / pedagogical lead, from the waiting list.",
    options: [
      {
        textFr: "L'administrateur, depuis la liste d'attente",
        textEn: "The admin, from the waiting list",
        isCorrect: true,
      },
      {
        textFr: "L'élève lui-même",
        textEn: "The student themself",
        isCorrect: false,
      },
      {
        textFr: "Automatiquement, sans intervention",
        textEn: "Automatically, with no action needed",
        isCorrect: false,
      },
      {
        textFr: "Le parent depuis son espace",
        textEn: "The parent from their space",
        isCorrect: false,
      },
    ],
  },
  {
    order: 7,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "La filière (spécialité) est un champ obligatoire à la création de l'élève.",
    textEn: "The track (branch) is a required field when creating the student.",
    hintFr: "Toutes les matières/niveaux n'ont pas de filière.",
    hintEn: "Not every subject/level has a track.",
    explanationFr: "Faux : la filière est facultative.",
    explanationEn: "False: the track is optional.",
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
      "Un élève en attente d'affectation apparaît-il pour n'importe quel niveau ou uniquement le sien ?",
    textEn: "Does a waiting student show up for any level, or only their own?",
    hintFr: "Un filtre par niveau existe justement pour cibler la bonne liste.",
    hintEn: "A level filter exists precisely to target the right list.",
    explanationFr:
      "Uniquement le sien : le filtre par niveau cible la liste correspondante.",
    explanationEn:
      "Only their own: the level filter targets the matching list.",
    options: [
      {
        textFr: "Uniquement son propre niveau",
        textEn: "Only their own level",
        isCorrect: true,
      },
      {
        textFr: "Tous les niveaux en même temps",
        textEn: "Every level at once",
        isCorrect: false,
      },
    ],
  },
  {
    order: 9,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Créez un nouvel élève en laissant la date de naissance vide : que se passe-t-il ?",
    textEn:
      "Create a new student leaving the date of birth empty: what happens?",
    hintFr: "Ce champ est explicitement marqué optionnel.",
    hintEn: "This field is explicitly marked optional.",
    explanationFr: "L'élève est créé normalement, ce champ étant optionnel.",
    explanationEn:
      "The student is created normally, since this field is optional.",
    options: [
      {
        textFr: "L'élève est créé normalement",
        textEn: "The student is created normally",
        isCorrect: true,
      },
      {
        textFr: "La création est bloquée",
        textEn: "Creation is blocked",
        isCorrect: false,
      },
      {
        textFr: "Une date par défaut aujourd'hui est appliquée",
        textEn: "Today's date is applied by default",
        isCorrect: false,
      },
      {
        textFr: "Un compte parent est créé automatiquement",
        textEn: "A parent account is created automatically",
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
      "Dans la liste d'attente, filtrez par année cible et niveau : que devez-vous choisir pour chaque élève affiché ?",
    textEn:
      "In the waiting list, filter by target year and level: what must you choose for each displayed student?",
    hintFr: "C'est la dernière étape du parcours de réinscription.",
    hintEn: "It's the last step of the re-enrollment journey.",
    explanationFr: "Sa classe définitive pour la nouvelle année scolaire.",
    explanationEn: "Their final class for the new school year.",
    options: [
      {
        textFr: "Sa classe définitive",
        textEn: "Their final class",
        isCorrect: true,
      },
      {
        textFr: "Son enseignant préféré",
        textEn: "Their favorite teacher",
        isCorrect: false,
      },
      {
        textFr: "Sa date d'anniversaire",
        textEn: "Their birthday",
        isCorrect: false,
      },
      {
        textFr: "Son mode de paiement",
        textEn: "Their payment method",
        isCorrect: false,
      },
    ],
  },
  {
    order: 11,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Essayez d'affecter un élève à une classe déjà pleine : l'affectation respecte la capacité maximale de la classe.",
    textEn:
      "Try assigning a student to an already-full class: the assignment respects the class's maximum capacity.",
    hintFr:
      "La capacité définie sur la fiche de la classe est une limite réelle.",
    hintEn: "The capacity set on the class's page is a real limit.",
    explanationFr:
      "Vrai : l'affectation respecte la capacité maximale définie pour la classe choisie.",
    explanationEn:
      "True: the assignment respects the maximum capacity defined for the chosen class.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 12,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Un élève payé pour le niveau CM2 mais dont le niveau cible sélectionné dans le filtre est CE2 : apparaît-il dans cette liste filtrée ?",
    textEn:
      "A student paid for the CM2 level, but the filter's selected target level is CE2: do they show up in this filtered list?",
    hintFr: "Le filtre niveau cible précisément le niveau de l'élève.",
    hintEn: "The level filter targets the student's exact level.",
    explanationFr:
      "Non, il n'apparaît que dans la liste filtrée sur son propre niveau (CM2).",
    explanationEn:
      "No, they only show up in the list filtered on their own level (CM2).",
    options: [
      { textFr: "Non", textEn: "No", isCorrect: true },
      { textFr: "Oui", textEn: "Yes", isCorrect: false },
    ],
  },
  {
    order: 13,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "En quoi la création directe d'un élève via Utilisateurs diffère-t-elle de sa création via Inscriptions ?",
    textEn:
      "How does creating a student directly via Users differ from creating one via Enrollments?",
    hintFr: "L'un exige une classe dès le départ, l'autre attend un paiement.",
    hintEn:
      "One requires a class from the start, the other waits for a payment.",
    explanationFr:
      "Via Utilisateurs, la classe est obligatoire dès la création ; via Inscriptions, l'élève n'a pas de classe et attend le paiement de la première échéance avant affectation.",
    explanationEn:
      "Via Users, the class is required at creation; via Enrollments, the student has no class and waits for the first installment before assignment.",
    options: [
      {
        textFr:
          "Utilisateurs exige une classe immédiate, Inscriptions attend un paiement",
        textEn:
          "Users requires an immediate class, Enrollments waits for a payment",
        isCorrect: true,
      },
      {
        textFr: "Il n'y a aucune différence",
        textEn: "There's no difference at all",
        isCorrect: false,
      },
      {
        textFr: "Inscriptions ne crée jamais de nouvel élève",
        textEn: "Enrollments never creates a new student",
        isCorrect: false,
      },
      {
        textFr: "Seul Utilisateurs permet de choisir un niveau",
        textEn: "Only Users lets you choose a level",
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
      "Le mécanisme de pool en attente d'affectation garantit qu'aucune classe ne dépasse sa capacité au moment de la rentrée.",
    textEn:
      "The assignment-waiting pool mechanism guarantees no class exceeds its capacity at the start of the school year.",
    hintFr:
      "L'affectation elle-même respecte toujours la capacité de la classe choisie.",
    hintEn:
      "The assignment itself always respects the chosen class's capacity.",
    explanationFr:
      "Vrai : chaque affectation individuelle respecte la capacité maximale de la classe choisie, empêchant tout dépassement.",
    explanationEn:
      "True: each individual assignment respects the chosen class's maximum capacity, preventing any overflow.",
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
