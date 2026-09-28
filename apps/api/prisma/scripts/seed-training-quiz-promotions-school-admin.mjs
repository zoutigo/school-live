import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/promotions";

const CHAPTER = {
  role: "SCHOOL_ADMIN",
  moduleKey: "promotions",
  order: 7,
  icon: "TrendingUp",
  colorFrom: "#16A34A",
  colorTo: "#15803D",
  titleFr: "Passages de classe",
  titleEn: "Grade promotions",
  descriptionFr:
    "Apprenez à saisir les décisions du conseil de classe, gérer les années scolaires et affecter les élèves réinscrits.",
  descriptionEn:
    "Learn how to enter class-council decisions, manage school years, and assign re-enrolled students.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quels sous-onglets existent dans le module Passages de classe ? (plusieurs réponses)",
    textEn:
      "Which sub-tabs exist in the Grade promotions module? (select all that apply)",
    hintFr: "Il y en a trois.",
    hintEn: "There are three.",
    explanationFr:
      "Décisions du conseil, Attente d'affectation, Années scolaires.",
    explanationEn: "Council decisions, Assignment waiting, School years.",
    options: [
      {
        textFr: "Décisions du conseil",
        textEn: "Council decisions",
        isCorrect: true,
      },
      {
        textFr: "Attente d'affectation",
        textEn: "Assignment waiting",
        isCorrect: true,
      },
      {
        textFr: "Années scolaires",
        textEn: "School years",
        isCorrect: true,
      },
      {
        textFr: "Facturation",
        textEn: "Billing",
        isCorrect: false,
      },
    ],
  },
  {
    order: 2,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quelles décisions de conseil peut-on saisir pour un élève ? (plusieurs réponses)",
    textEn:
      "Which council decisions can be entered for a student? (select all that apply)",
    hintFr: "Il y en a exactement trois.",
    hintEn: "There are exactly three.",
    explanationFr: "Promu, Redouble, Quitte l'établissement.",
    explanationEn: "Promoted, Repeated, Left the school.",
    options: [
      { textFr: "Promu", textEn: "Promoted", isCorrect: true },
      { textFr: "Redouble", textEn: "Repeated", isCorrect: true },
      {
        textFr: "Quitte l'établissement",
        textEn: "Left the school",
        isCorrect: true,
      },
      {
        textFr: "Exclu temporairement",
        textEn: "Temporarily excluded",
        isCorrect: false,
      },
    ],
  },
  {
    order: 3,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "À quel document une décision de conseil est-elle rattachée ?",
    textEn: "Which document is a council decision attached to?",
    hintFr: "C'est le bulletin de fin d'année de l'élève.",
    hintEn: "It's the student's end-of-year report card.",
    explanationFr: "Le bulletin du dernier trimestre de l'élève.",
    explanationEn: "The student's last-term report card.",
    options: [
      {
        textFr: "Le bulletin du dernier trimestre",
        textEn: "The last term's report card",
        isCorrect: true,
      },
      {
        textFr: "La fiche d'échéancier de paiement",
        textEn: "The payment schedule record",
        isCorrect: false,
      },
      {
        textFr: "Le dossier disciplinaire",
        textEn: "The discipline file",
        isCorrect: false,
      },
      {
        textFr: "La fiche de santé",
        textEn: "The health record",
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
      'Pour une décision "Promu", vous devez aussi choisir un niveau cible pour l\'année suivante.',
    textEn:
      'For a "Promoted" decision, you must also choose a target level for next year.',
    hintFr:
      "C'est ce niveau qui déterminera dans quelle liste d'attente il apparaîtra.",
    hintEn: "That level determines which waiting list they'll show up in.",
    explanationFr:
      "Vrai : sauf en cas de départ, un niveau cible (et une filière si besoin) doit être choisi.",
    explanationEn:
      "True: except on departure, a target level (and track if needed) must be chosen.",
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
    textFr: "Qu'affiche l'onglet Attente d'affectation ?",
    textEn: "What does the Assignment waiting tab show?",
    hintFr: "Ce sont des élèves qui ont déjà franchi une étape financière.",
    hintEn: "These are students who already crossed a financial milestone.",
    explanationFr:
      "Les élèves déjà réinscrits (1ère échéance payée) qui attendent une classe définitive.",
    explanationEn:
      "Already re-enrolled students (first installment paid) waiting for a final class.",
    options: [
      {
        textFr: "Les élèves réinscrits en attente de classe définitive",
        textEn: "Re-enrolled students waiting for a final class",
        isCorrect: true,
      },
      {
        textFr: "Les élèves en attente de bulletin",
        textEn: "Students waiting for a report card",
        isCorrect: false,
      },
      {
        textFr: "Les enseignants en attente d'affectation",
        textEn: "Teachers waiting for an assignment",
        isCorrect: false,
      },
      {
        textFr: "Les salles en travaux",
        textEn: "Rooms under renovation",
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
      "Un élève apparaît en attente d'affectation même s'il n'a pas encore payé sa première échéance.",
    textEn:
      "A student shows up in the waiting list even without having paid their first installment yet.",
    hintFr:
      "C'est justement ce paiement qui déclenche son apparition dans la liste.",
    hintEn:
      "That payment is precisely what triggers their appearance in the list.",
    explanationFr:
      "Faux : sans ce paiement (module Paiements ou wallet parent), il n'apparaît nulle part.",
    explanationEn:
      "False: without that payment (Payments module or parent wallet), they don't show up anywhere.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Que permet de faire l'onglet Années scolaires ?",
    textEn: "What does the School years tab let you do?",
    hintFr: "On y crée une nouvelle année et on peut y dupliquer des classes.",
    hintEn: "You create a new year here, and can duplicate classes.",
    explanationFr:
      "Créer une nouvelle année scolaire, l'activer, et dupliquer des classes d'une année vers une autre.",
    explanationEn:
      "Create a new school year, activate it, and duplicate classes from one year to another.",
    options: [
      {
        textFr: "Créer, activer une année, et dupliquer des classes",
        textEn: "Create, activate a year, and duplicate classes",
        isCorrect: true,
      },
      {
        textFr: "Modifier les frais de scolarité",
        textEn: "Edit tuition fees",
        isCorrect: false,
      },
      {
        textFr: "Créer des comptes enseignants",
        textEn: "Create teacher accounts",
        isCorrect: false,
      },
      {
        textFr: "Envoyer les bulletins par email",
        textEn: "Email report cards",
        isCorrect: false,
      },
    ],
  },
  {
    order: 8,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Il faut activer une nouvelle année scolaire dès sa création pour permettre les réinscriptions.",
    textEn:
      "You must activate a new school year right at creation to allow re-enrollments.",
    hintFr:
      "Un message le précise explicitement dans l'onglet Années scolaires.",
    hintEn: "A message explicitly states this in the School years tab.",
    explanationFr:
      "Faux : elle peut être créée sans être activée tout de suite, cela suffit déjà à permettre les réinscriptions.",
    explanationEn:
      "False: it can be created without being activated right away, that's already enough to allow re-enrollments.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 9,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Que propose l'option \"Dupliquer aussi les affectations d'enseignants\" lors de la duplication des classes ?",
    textEn:
      'What does the "Also duplicate teacher assignments" option offer when duplicating classes?',
    hintFr: "Elle évite de tout réaffecter manuellement matière par matière.",
    hintEn: "It avoids manually reassigning everything subject by subject.",
    explanationFr:
      "Elle recopie, en plus des classes, les enseignants déjà affectés par matière vers l'année cible.",
    explanationEn:
      "It copies, along with the classes, the teachers already assigned per subject to the target year.",
    options: [
      {
        textFr: "Recopier aussi les enseignants déjà affectés par matière",
        textEn: "Also copy the teachers already assigned per subject",
        isCorrect: true,
      },
      {
        textFr: "Recopier les décisions de conseil",
        textEn: "Copy the council decisions",
        isCorrect: false,
      },
      {
        textFr: "Recopier les échéanciers de paiement",
        textEn: "Copy the payment schedules",
        isCorrect: false,
      },
      {
        textFr: "Supprimer les affectations existantes",
        textEn: "Delete existing assignments",
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
      'Ouvrez Décisions du conseil pour une classe, choisissez "Redouble" pour un élève : quel champ apparaît ensuite ?',
    textEn:
      'Open Council decisions for a class, pick "Repeated" for a student: which field appears next?',
    hintFr: "Ce champ précise dans quel niveau il redouble.",
    hintEn: "This field specifies which level they repeat.",
    explanationFr:
      "Le niveau cible (généralement le même niveau que cette année).",
    explanationEn: "The target level (usually the same level as this year).",
    options: [
      {
        textFr: "Le niveau cible",
        textEn: "The target level",
        isCorrect: true,
      },
      {
        textFr: "Le montant de la pénalité",
        textEn: "The penalty amount",
        isCorrect: false,
      },
      {
        textFr: "Le nom du nouvel enseignant",
        textEn: "The new teacher's name",
        isCorrect: false,
      },
      {
        textFr: "La date de départ de l'élève",
        textEn: "The student's departure date",
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
      'Choisissez "Quitte l\'établissement" pour un élève : devez-vous encore choisir un niveau cible ?',
    textEn:
      'Choose "Left the school" for a student: do you still need to choose a target level?',
    hintFr: "Cette décision est la seule exception à la règle du niveau cible.",
    hintEn: "This decision is the only exception to the target-level rule.",
    explanationFr: "Non, le niveau cible n'est pas demandé en cas de départ.",
    explanationEn: "No, the target level isn't requested on departure.",
    options: [
      { textFr: "Non", textEn: "No", isCorrect: true },
      { textFr: "Oui", textEn: "Yes", isCorrect: false },
    ],
  },
  {
    order: 12,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Dans Attente d'affectation, filtrez sur l'année cible et un niveau, puis affectez un élève à une classe déjà pleine : que se passe-t-il ?",
    textEn:
      "In Assignment waiting, filter by target year and level, then assign a student to an already-full class: what happens?",
    hintFr: "La capacité maximale de la classe est une contrainte réelle.",
    hintEn: "The class's maximum capacity is a real constraint.",
    explanationFr:
      "L'affectation est refusée : elle respecte la capacité maximale de la classe.",
    explanationEn:
      "The assignment is refused: it respects the class's maximum capacity.",
    options: [
      {
        textFr: "L'affectation est refusée",
        textEn: "The assignment is refused",
        isCorrect: true,
      },
      {
        textFr: "L'élève est ajouté au-delà de la capacité",
        textEn: "The student is added beyond capacity",
        isCorrect: false,
      },
      {
        textFr: "Une nouvelle classe est créée automatiquement",
        textEn: "A new class is created automatically",
        isCorrect: false,
      },
      {
        textFr: "L'élève est renvoyé au conseil de classe",
        textEn: "The student is sent back to the class council",
        isCorrect: false,
      },
    ],
  },
  {
    order: 13,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Créez une nouvelle année scolaire avec seulement son libellé (sans dates) : l'opération réussit.",
    textEn:
      "Create a new school year with only its label (no dates): the operation succeeds.",
    hintFr: "Début et fin sont explicitement marqués optionnels.",
    hintEn: "Start and end are explicitly marked optional.",
    explanationFr: "Vrai : seul le libellé (ex. 2026-2027) est obligatoire.",
    explanationEn: "True: only the label (e.g. 2026-2027) is required.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 14,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quelles sont, dans l'ordre, les trois étapes du passage de classe ?",
    textEn: "In order, what are the three steps of grade promotion?",
    hintFr: "Une décision, puis un paiement, puis une affectation.",
    hintEn: "A decision, then a payment, then an assignment.",
    explanationFr:
      "1. Décision du conseil, 2. Réinscription (paiement 1ère échéance), 3. Affectation à la classe définitive.",
    explanationEn:
      "1. Council decision, 2. Re-enrollment (first installment paid), 3. Assignment to the final class.",
    options: [
      {
        textFr: "Décision du conseil → Réinscription → Affectation",
        textEn: "Council decision → Re-enrollment → Assignment",
        isCorrect: true,
      },
      {
        textFr: "Affectation → Décision du conseil → Réinscription",
        textEn: "Assignment → Council decision → Re-enrollment",
        isCorrect: false,
      },
      {
        textFr: "Réinscription → Affectation → Décision du conseil",
        textEn: "Re-enrollment → Assignment → Council decision",
        isCorrect: false,
      },
      {
        textFr: "Il n'y a qu'une seule étape",
        textEn: "There's only one single step",
        isCorrect: false,
      },
    ],
  },
  {
    order: 15,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Pourquoi la décision du conseil est-elle une condition nécessaire au paiement de réinscription dans le module Paiements ?",
    textEn:
      "Why is the council decision a necessary condition for the re-enrollment payment in the Payments module?",
    hintFr:
      "Sans elle, le système ignore le niveau cible de l'élève pour l'année suivante.",
    hintEn:
      "Without it, the system doesn't know the student's target level for next year.",
    explanationFr:
      "Parce que le module Paiements a besoin du niveau cible de l'élève pour calculer l'échéancier de l'année suivante ; sans décision, il ne peut pas accepter de versement ou de réinscription via le wallet parent.",
    explanationEn:
      "Because the Payments module needs the student's target level to compute next year's schedule; without a decision, it cannot accept a payment or re-enrollment via the parent wallet.",
    options: [
      {
        textFr: "Le niveau cible est requis pour calculer l'échéancier suivant",
        textEn: "The target level is needed to compute next year's schedule",
        isCorrect: true,
      },
      {
        textFr:
          "C'est une contrainte purement administrative sans lien technique",
        textEn:
          "It's a purely administrative constraint with no technical link",
        isCorrect: false,
      },
      {
        textFr:
          "Le module Paiements ignore totalement les décisions du conseil",
        textEn: "The Payments module completely ignores council decisions",
        isCorrect: false,
      },
      {
        textFr: "Cela ne concerne que les élèves qui redoublent",
        textEn: "This only concerns repeating students",
        isCorrect: false,
      },
    ],
  },
  {
    order: 16,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Dupliquer les classes d'une année vers une autre sans cocher \"Dupliquer aussi les affectations d'enseignants\" laisse les nouvelles classes sans aucun enseignant affecté par matière.",
    textEn:
      'Duplicating classes from one year to another without checking "Also duplicate teacher assignments" leaves the new classes with no teacher assigned per subject.',
    hintFr: "Sans cette option, seule la structure des classes est recopiée.",
    hintEn: "Without that option, only the class structure is copied.",
    explanationFr:
      "Vrai : sans cette option, il faudra réaffecter manuellement chaque enseignant par matière depuis Classes ou Matières.",
    explanationEn:
      "True: without that option, each teacher must be manually reassigned per subject from Classes or Subjects.",
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
