import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/classes/{classId}/devoirs";

const CHAPTER = {
  role: "TEACHER",
  moduleKey: "devoirs",
  order: 2,
  icon: "ClipboardList",
  colorFrom: "#E08A3C",
  colorTo: "#B4661C",
  titleFr: "Devoirs",
  titleEn: "Homework",
  descriptionFr:
    "Apprenez à créer les devoirs de votre classe et à suivre leur avancement.",
  descriptionEn:
    "Learn how to create homework for your class and track its completion.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Où créez-vous un nouveau devoir pour votre classe ?",
    textEn: "Where do you create a new homework for your class?",
    hintFr: "C'est l'onglet Liste, avec un bouton dédié.",
    hintEn: "It's the List tab, with a dedicated button.",
    explanationFr: 'Dans l\'onglet Liste, avec le bouton "Nouveau devoir".',
    explanationEn: 'In the List tab, with the "New homework" button.',
    options: [
      {
        textFr: 'Dans l\'onglet Liste, bouton "Nouveau devoir"',
        textEn: 'In the List tab, "New homework" button',
        isCorrect: true,
      },
      {
        textFr: "Dans la messagerie",
        textEn: "In messaging",
        isCorrect: false,
      },
      {
        textFr: "Dans l'onglet Voir",
        textEn: "In the View tab",
        isCorrect: false,
      },
      {
        textFr: "Il faut le demander à l'administration",
        textEn: "You must ask the administration",
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
      "Quelles informations sont obligatoires pour créer un devoir ? (plusieurs réponses)",
    textEn:
      "Which information is required to create a homework? (select all that apply)",
    hintFr: "Les consignes détaillées ne sont pas dans cette liste.",
    hintEn: "The detailed instructions are not on this list.",
    explanationFr:
      "La matière, le titre et la date de rendu sont obligatoires ; les consignes sont facultatives.",
    explanationEn:
      "Subject, title and due date are required; the instructions are optional.",
    options: [
      { textFr: "La matière", textEn: "The subject", isCorrect: true },
      { textFr: "Le titre", textEn: "The title", isCorrect: true },
      {
        textFr: "La date de rendu",
        textEn: "The due date",
        isCorrect: true,
      },
      {
        textFr: "Les consignes détaillées",
        textEn: "The detailed instructions",
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
    textFr: "Les consignes détaillées d'un devoir sont facultatives.",
    textEn: "A homework's detailed instructions are optional.",
    hintFr: 'Le champ est marqué "optionnel".',
    hintEn: 'The field is marked "optional".',
    explanationFr:
      "Vrai : le titre, la matière et la date de rendu suffisent, les consignes peuvent être ajoutées ou non.",
    explanationEn:
      "True: title, subject and due date are enough, instructions can be added or skipped.",
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
    textFr: "Vous pouvez joindre une ou plusieurs pièces jointes à un devoir.",
    textEn: "You can attach one or more files to a homework.",
    hintFr: "Le formulaire propose un bouton dédié pour cela.",
    hintEn: "The form offers a dedicated button for this.",
    explanationFr:
      'Vrai : le bouton "Ajouter une pièce jointe" permet d\'en joindre autant que nécessaire.',
    explanationEn:
      'True: the "Add attachment" button lets you attach as many as needed.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 5,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quels statuts d'avancement peuvent apparaître sur un devoir de la liste ? (plusieurs réponses)",
    textEn:
      "Which completion statuses can appear on a homework in the list? (select all that apply)",
    hintFr: "Un des statuts signale un retard.",
    hintEn: "One status signals lateness.",
    explanationFr: "À faire, En retard et Validé.",
    explanationEn: "To do, Late and Done.",
    options: [
      { textFr: "À faire", textEn: "To do", isCorrect: true },
      { textFr: "En retard", textEn: "Late", isCorrect: true },
      { textFr: "Validé", textEn: "Done", isCorrect: true },
      {
        textFr: "Rejeté",
        textEn: "Rejected",
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
    textFr: "Que présente l'onglet Voir, à la différence de l'onglet Liste ?",
    textEn: "What does the View tab show, unlike the List tab?",
    hintFr: "C'est une vue chiffrée, pas une liste détaillée.",
    hintEn: "It's a figures view, not a detailed list.",
    explanationFr:
      "Une synthèse pour la classe : nombre total de devoirs, ceux à faire et ceux en retard.",
    explanationEn:
      "A class-wide summary: total homework count, how many are to do and how many are late.",
    options: [
      {
        textFr: "Une synthèse chiffrée de la classe",
        textEn: "A class-wide figures summary",
        isCorrect: true,
      },
      {
        textFr: "La messagerie des parents",
        textEn: "The parents' messaging",
        isCorrect: false,
      },
      {
        textFr: "L'emploi du temps",
        textEn: "The timetable",
        isCorrect: false,
      },
      {
        textFr: "Le détail de chaque élève un par un",
        textEn: "Each student's detail one by one",
        isCorrect: false,
      },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: 'Que montre la section "Suivi élèves" du détail d\'un devoir ?',
    textEn:
      'What does the "Student tracking" section of a homework\'s detail show?',
    hintFr: "Elle liste les élèves de la classe.",
    hintEn: "It lists the students of the class.",
    explanationFr:
      "Pour chaque élève de la classe, si le devoir a été fait ou non.",
    explanationEn:
      "For each student in the class, whether the homework was done or not.",
    options: [
      {
        textFr: "Pour chaque élève, si le devoir est fait ou non",
        textEn: "For each student, whether the homework is done or not",
        isCorrect: true,
      },
      {
        textFr: "La note obtenue par chaque élève",
        textEn: "Each student's grade",
        isCorrect: false,
      },
      {
        textFr: "Les absences de la classe",
        textEn: "The class's absences",
        isCorrect: false,
      },
      {
        textFr: "Rien, cette section n'existe pas",
        textEn: "Nothing, this section does not exist",
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
    textFr: "Un devoir peut recevoir des commentaires.",
    textEn: "A homework can receive comments.",
    hintFr: 'Une section "Commentaires" est visible dans le détail.',
    hintEn: 'A "Comments" section is visible in the detail.',
    explanationFr:
      "Vrai : la fiche détaillée du devoir affiche une section Commentaires.",
    explanationEn: "True: the homework's detail card shows a Comments section.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 9,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "En tant qu'enseignant, vous pouvez modifier ou supprimer un devoir que vous avez créé.",
    textEn: "As a teacher, you can edit or delete a homework you created.",
    hintFr: "Les boutons Modifier et Supprimer sont sur sa fiche.",
    hintEn: "Edit and Delete buttons are on its card.",
    explanationFr: "Vrai : la fiche du devoir propose Modifier et Supprimer.",
    explanationEn: "True: the homework's card offers Edit and Delete.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 10,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: 'Que montre le préfixe "Par" sur une carte de devoir ?',
    textEn: 'What does the "By" prefix show on a homework card?',
    hintFr: "C'est une information sur l'origine du devoir.",
    hintEn: "It's information about the homework's origin.",
    explanationFr: "Le nom de l'enseignant qui a créé le devoir.",
    explanationEn: "The name of the teacher who created the homework.",
    options: [
      {
        textFr: "L'enseignant qui a créé le devoir",
        textEn: "The teacher who created the homework",
        isCorrect: true,
      },
      {
        textFr: "L'élève qui l'a terminé en premier",
        textEn: "The student who finished it first",
        isCorrect: false,
      },
      {
        textFr: "Le directeur de l'école",
        textEn: "The school principal",
        isCorrect: false,
      },
      {
        textFr: "Rien, ce champ n'existe pas",
        textEn: "Nothing, this field does not exist",
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
      "Ouvrez l'onglet Liste et créez un nouveau devoir : quelle matière doit-il obligatoirement porter ?",
    textEn:
      "Open the List tab and create a new homework: which subject must it carry?",
    hintFr:
      "Choisissez n'importe quelle matière que vous enseignez à cette classe.",
    hintEn: "Pick any subject you teach in this class.",
    explanationFr:
      "Une matière que vous enseignez réellement dans cette classe.",
    explanationEn: "A subject you actually teach in this class.",
    options: [
      {
        textFr: "Une matière que vous enseignez dans cette classe",
        textEn: "A subject you teach in this class",
        isCorrect: true,
      },
      {
        textFr: "N'importe quelle matière de l'établissement",
        textEn: "Any subject in the school",
        isCorrect: false,
      },
      {
        textFr: "Aucune, la matière est facultative",
        textEn: "None, the subject is optional",
        isCorrect: false,
      },
      {
        textFr: 'Toujours "Vie scolaire"',
        textEn: 'Always "School life"',
        isCorrect: false,
      },
    ],
  },
  {
    order: 12,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Ouvrez le détail d'un devoir déjà publié : la section Suivi élèves se met-elle à jour au fur et à mesure que les élèves valident ?",
    textEn:
      "Open the detail of an already published homework: does the Student tracking section update as students validate it?",
    hintFr: "C'est un suivi en direct, pas un instantané figé.",
    hintEn: "It's a live tracking, not a frozen snapshot.",
    explanationFr:
      "Vrai : la liste reflète en direct qui a marqué le devoir comme fait.",
    explanationEn:
      "True: the list reflects live who has marked the homework as done.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 13,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Ouvrez un devoir et ajoutez un commentaire : où apparaît-il ensuite ?",
    textEn:
      "Open a homework and add a comment: where does it appear afterwards?",
    hintFr: "Une section porte exactement ce nom.",
    hintEn: "A section carries exactly that name.",
    explanationFr:
      "Dans la section Commentaires de la fiche détaillée du devoir.",
    explanationEn: "In the Comments section of the homework's detail card.",
    options: [
      {
        textFr: "Dans la section Commentaires du devoir",
        textEn: "In the homework's Comments section",
        isCorrect: true,
      },
      {
        textFr: "Dans la messagerie privée",
        textEn: "In private messaging",
        isCorrect: false,
      },
      {
        textFr: "Nulle part, ce n'est pas enregistré",
        textEn: "Nowhere, it isn't saved",
        isCorrect: false,
      },
      {
        textFr: "Dans le fil d'actualité de l'école",
        textEn: "In the school's news feed",
        isCorrect: false,
      },
    ],
  },
  {
    order: 14,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Modifiez la date de rendu d'un devoir existant pour la mettre dans le passé : que devient son statut dans la liste ?",
    textEn:
      "Edit an existing homework's due date to set it in the past: what does its status become in the list?",
    hintFr: "C'est le même statut que pour un devoir non fait après sa date.",
    hintEn: "It's the same status as an undone homework past its date.",
    explanationFr:
      'Il passe en "En retard" pour les élèves qui ne l\'ont pas encore validé.',
    explanationEn:
      'It becomes "Late" for the students who haven\'t validated it yet.',
    options: [
      { textFr: "En retard", textEn: "Late", isCorrect: true },
      { textFr: "Validé", textEn: "Done", isCorrect: false },
      {
        textFr: "Il disparaît de la liste",
        textEn: "It disappears from the list",
        isCorrect: false,
      },
      {
        textFr: "Rien ne change",
        textEn: "Nothing changes",
        isCorrect: false,
      },
    ],
  },
  {
    order: 15,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      'Ouvrez l\'onglet Voir : les compteurs "À faire" et "En retard" portent-ils sur toute la classe, et non sur un seul élève ?',
    textEn:
      'Open the View tab: do the "To do" and "Late" counters cover the whole class, not just one student?',
    hintFr: "C'est une synthèse, pas un détail individuel.",
    hintEn: "It's a summary, not an individual detail.",
    explanationFr: "Vrai : ce sont des totaux pour l'ensemble de la classe.",
    explanationEn: "True: these are totals for the whole class.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 16,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Supprimez un devoir de test que vous venez de créer : que devient-il pour les élèves qui le voyaient déjà ?",
    textEn:
      "Delete a test homework you just created: what happens to it for students who already saw it?",
    hintFr: "La suppression est définitive.",
    hintEn: "Deletion is permanent.",
    explanationFr: "Il disparaît complètement, pour vous comme pour eux.",
    explanationEn: "It disappears entirely, for you and for them.",
    options: [
      {
        textFr: "Il disparaît complètement",
        textEn: "It disappears entirely",
        isCorrect: true,
      },
      {
        textFr: "Il reste visible en lecture seule",
        textEn: "It stays visible read-only",
        isCorrect: false,
      },
      {
        textFr: "Il repasse en brouillon",
        textEn: "It reverts to draft",
        isCorrect: false,
      },
      {
        textFr: "Seul l'enseignant ne le voit plus",
        textEn: "Only the teacher stops seeing it",
        isCorrect: false,
      },
    ],
  },
  {
    order: 17,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Ouvrez le formulaire de création d'un devoir et ajoutez une pièce jointe : à quoi cela sert-il typiquement ?",
    textEn:
      "Open the homework creation form and add an attachment: what is this typically for?",
    hintFr: "Pensez à un support que l'élève doit consulter.",
    hintEn: "Think of a resource the student needs to consult.",
    explanationFr:
      "À fournir un support (fiche, exercice, document) nécessaire pour réaliser le devoir.",
    explanationEn:
      "To provide a resource (worksheet, exercise, document) needed to do the homework.",
    options: [
      {
        textFr: "Fournir un support nécessaire au devoir",
        textEn: "Provide a resource needed for the homework",
        isCorrect: true,
      },
      {
        textFr: "Remplacer les consignes",
        textEn: "Replace the instructions",
        isCorrect: false,
      },
      {
        textFr: "Envoyer un message privé à un élève",
        textEn: "Send a private message to a student",
        isCorrect: false,
      },
      {
        textFr: "Créer automatiquement une évaluation",
        textEn: "Automatically create an evaluation",
        isCorrect: false,
      },
    ],
  },
  {
    order: 18,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      'Pourquoi le statut "En retard" est-il calculé automatiquement plutôt que saisi manuellement ?',
    textEn:
      'Why is the "Late" status computed automatically rather than entered manually?',
    hintFr: "Il dépend de deux informations déjà connues du système.",
    hintEn: "It depends on two pieces of information the system already has.",
    explanationFr:
      'Parce qu\'il découle directement de la date de rendu et de l\'état "fait"/"non fait" de chaque élève.',
    explanationEn:
      "Because it follows directly from the due date and each student's done/not-done state.",
    options: [
      {
        textFr: "Il découle de la date de rendu et de l'état fait/non fait",
        textEn: "It follows from the due date and the done/not-done state",
        isCorrect: true,
      },
      {
        textFr: "C'est l'enseignant qui le choisit à chaque fois",
        textEn: "The teacher chooses it every time",
        isCorrect: false,
      },
      {
        textFr: "C'est toujours le même statut par défaut",
        textEn: "It's always the same default status",
        isCorrect: false,
      },
      {
        textFr: "Il dépend de la note de l'élève",
        textEn: "It depends on the student's grade",
        isCorrect: false,
      },
    ],
  },
  {
    order: 19,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Un devoir sans date de rendu ne peut pas être créé, car le statut à faire/en retard en dépend entièrement.",
    textEn:
      "A homework without a due date cannot be created, because the to-do/late status entirely depends on it.",
    hintFr: "Repensez aux champs obligatoires du formulaire.",
    hintEn: "Think back to the form's required fields.",
    explanationFr:
      "Vrai : la date de rendu est obligatoire, précisément parce que le statut en dépend.",
    explanationEn:
      "True: the due date is required, precisely because the status depends on it.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 20,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Un élève marque son devoir comme fait la veille de la date de rendu, puis un autre le fait après la date : comment leurs statuts diffèrent-ils dans le Suivi élèves ?",
    textEn:
      "One student marks their homework done the day before the due date, another does it after the due date: how do their statuses differ in Student tracking?",
    hintFr: "Le suivi élèves n'affiche que fait ou non fait.",
    hintEn: "Student tracking only shows done or not done.",
    explanationFr:
      "Ils apparaissent tous les deux comme \"fait\" dans le Suivi élèves — la ponctualité n'y est pas distinguée, seul l'agrégat À faire/En retard de l'onglet Voir reflète le retard global.",
    explanationEn:
      'Both show as "done" in Student tracking — punctuality isn\'t distinguished there, only the To do/Late aggregate in the View tab reflects overall lateness.',
    options: [
      {
        textFr: 'Les deux apparaissent "fait", sans distinction de ponctualité',
        textEn: 'Both show as "done", with no punctuality distinction',
        isCorrect: true,
      },
      {
        textFr: 'Le second reste marqué "en retard" définitivement',
        textEn: 'The second stays marked "late" permanently',
        isCorrect: false,
      },
      {
        textFr: "Le premier reçoit un bonus visible",
        textEn: "The first gets a visible bonus",
        isCorrect: false,
      },
      {
        textFr: "Le second est automatiquement supprimé",
        textEn: "The second is automatically deleted",
        isCorrect: false,
      },
    ],
  },
  {
    order: 21,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Les parents et élèves de la classe voient les mêmes devoirs que ceux affichés dans votre onglet Liste.",
    textEn:
      "Parents and students of the class see the same homework shown in your List tab.",
    hintFr: "Le devoir est créé une seule fois pour toute la classe.",
    hintEn: "The homework is created once for the whole class.",
    explanationFr:
      "Vrai : un devoir créé pour la classe est visible par tous les élèves et parents de cette classe, dans leur propre module Devoirs.",
    explanationEn:
      "True: a homework created for the class is visible to every student and parent of that class, in their own Homework module.",
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
