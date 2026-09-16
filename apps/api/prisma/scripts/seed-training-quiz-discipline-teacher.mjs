import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/classes/{classId}/discipline";

const CHAPTER = {
  role: "TEACHER",
  moduleKey: "discipline",
  order: 3,
  icon: "ShieldCheck",
  colorFrom: "#4C6FE0",
  colorTo: "#2F4FB0",
  titleFr: "Discipline",
  titleEn: "Discipline",
  descriptionFr:
    "Apprenez à signaler une absence, un retard, une punition ou une sanction pour vos élèves.",
  descriptionEn:
    "Learn how to report an absence, a lateness, a punishment or a sanction for your students.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quel onglet utilisez-vous pour signaler un nouvel événement disciplinaire ?",
    textEn: "Which tab do you use to report a new discipline event?",
    hintFr: "L'autre onglet sert seulement à consulter.",
    hintEn: "The other tab is only for viewing.",
    explanationFr: "L'onglet Saisie.",
    explanationEn: "The Entry tab.",
    options: [
      { textFr: "Saisie", textEn: "Entry", isCorrect: true },
      { textFr: "Historique", textEn: "History", isCorrect: false },
      { textFr: "Messagerie", textEn: "Messaging", isCorrect: false },
      { textFr: "Emploi du temps", textEn: "Timetable", isCorrect: false },
    ],
  },
  {
    order: 2,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quels types d'événement pouvez-vous signaler pour un élève ? (plusieurs réponses)",
    textEn:
      "Which event types can you report for a student? (select all that apply)",
    hintFr: "Il y en a quatre au total.",
    hintEn: "There are four in total.",
    explanationFr: "Absence, Retard, Sanction et Punition.",
    explanationEn: "Absence, Lateness, Sanction and Punishment.",
    options: [
      { textFr: "Absence", textEn: "Absence", isCorrect: true },
      { textFr: "Retard", textEn: "Lateness", isCorrect: true },
      { textFr: "Sanction", textEn: "Sanction", isCorrect: true },
      { textFr: "Punition", textEn: "Punishment", isCorrect: true },
    ],
  },
  {
    order: 3,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Le motif de l'événement est obligatoire.",
    textEn: "The event's reason is required.",
    hintFr: "C'est le champ qui explique ce qui s'est passé.",
    hintEn: "It's the field explaining what happened.",
    explanationFr:
      "Vrai : sans motif, l'événement ne peut pas être enregistré.",
    explanationEn: "True: without a reason, the event cannot be saved.",
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
    textFr: "La durée en minutes est un champ obligatoire pour tout événement.",
    textEn: "The duration in minutes is required for every event.",
    hintFr: "Regardez le libellé exact du champ.",
    hintEn: "Look at the field's exact label.",
    explanationFr:
      'Faux : le champ précise lui-même "optionnel", elle n\'a de sens que pour un retard ou une punition avec retenue.',
    explanationEn:
      'False: the field itself is labelled "optional", it only makes sense for a lateness or a punishment with detention.',
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
      "À quels types d'événement la case \"Justifié\" s'applique-t-elle ?",
    textEn: 'Which event types does the "Justified" checkbox apply to?',
    hintFr: "Son libellé précise les deux types concernés.",
    hintEn: "Its label names the two types concerned.",
    explanationFr: "Absence et retard.",
    explanationEn: "Absence and lateness.",
    options: [
      {
        textFr: "Absence et retard",
        textEn: "Absence and lateness",
        isCorrect: true,
      },
      {
        textFr: "Sanction et punition",
        textEn: "Sanction and punishment",
        isCorrect: false,
      },
      {
        textFr: "Tous les types sans exception",
        textEn: "All types without exception",
        isCorrect: false,
      },
      {
        textFr: "Aucun type",
        textEn: "No type",
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
    textFr:
      "Que devez-vous faire avant de renseigner un événement dans l'onglet Saisie ?",
    textEn: "What must you do before filling in an event in the Entry tab?",
    hintFr: "L'événement concerne toujours une seule personne.",
    hintEn: "The event always concerns a single person.",
    explanationFr: "Sélectionner l'élève concerné dans la liste.",
    explanationEn: "Select the student concerned from the list.",
    options: [
      {
        textFr: "Sélectionner l'élève concerné",
        textEn: "Select the student concerned",
        isCorrect: true,
      },
      {
        textFr: "Prévenir l'administration par téléphone",
        textEn: "Notify the administration by phone",
        isCorrect: false,
      },
      {
        textFr: "Publier une évaluation",
        textEn: "Publish an evaluation",
        isCorrect: false,
      },
      {
        textFr: "Rien, l'élève se choisit automatiquement",
        textEn: "Nothing, the student is picked automatically",
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
    textFr: "Où consultez-vous les événements déjà enregistrés pour un élève ?",
    textEn: "Where do you check the events already recorded for a student?",
    hintFr: "C'est l'onglet complémentaire à Saisie.",
    hintEn: "It's the tab that complements Entry.",
    explanationFr: "Dans l'onglet Historique.",
    explanationEn: "In the History tab.",
    options: [
      { textFr: "Historique", textEn: "History", isCorrect: true },
      { textFr: "Saisie", textEn: "Entry", isCorrect: false },
      { textFr: "Messagerie", textEn: "Messaging", isCorrect: false },
      {
        textFr: "Conseil de classe",
        textEn: "Class council",
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
    textFr: "Vous pouvez ajouter un commentaire optionnel en plus du motif.",
    textEn: "You can add an optional comment in addition to the reason.",
    hintFr: "Deux champs texte existent : l'un obligatoire, l'autre non.",
    hintEn: "Two text fields exist: one required, one not.",
    explanationFr:
      "Vrai : le commentaire est un champ distinct et facultatif, en plus du motif obligatoire.",
    explanationEn:
      "True: the comment is a separate, optional field, in addition to the required reason.",
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
      "Un événement disciplinaire déjà enregistré peut être modifié ou supprimé.",
    textEn: "An already recorded discipline event can be edited or deleted.",
    hintFr:
      'Repensez aux libellés "Enregistrer les modifications" et à une confirmation de suppression.',
    hintEn: 'Think back to the "Save changes" label and a delete confirmation.',
    explanationFr:
      "Vrai : chaque événement peut être corrigé ou supprimé après coup.",
    explanationEn: "True: each event can be corrected or deleted afterwards.",
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
    textFr:
      "En plus du type et du motif, quelle information de temps devez-vous renseigner ?",
    textEn:
      "Besides the type and the reason, which time information must you fill in?",
    hintFr: "C'est un champ combiné, pas juste une date.",
    hintEn: "It's a combined field, not just a date.",
    explanationFr: "La date et l'heure de l'événement.",
    explanationEn: "The event's date and time.",
    options: [
      {
        textFr: "La date et l'heure",
        textEn: "The date and time",
        isCorrect: true,
      },
      {
        textFr: "Uniquement l'année scolaire",
        textEn: "Only the school year",
        isCorrect: false,
      },
      {
        textFr: "Rien, c'est facultatif",
        textEn: "Nothing, it's optional",
        isCorrect: false,
      },
      {
        textFr: "La date de naissance de l'élève",
        textEn: "The student's date of birth",
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
      'Ouvrez l\'onglet Saisie, sélectionnez un élève, puis choisissez "Retard" comme type : quelle case supplémentaire apparaît alors ?',
    textEn:
      'Open the Entry tab, select a student, then choose "Lateness" as the type: which extra checkbox then appears?',
    hintFr: "Elle sert à indiquer si l'élève avait un motif valable.",
    hintEn: "It indicates whether the student had a valid reason.",
    explanationFr: 'La case "Justifié".',
    explanationEn: 'The "Justified" checkbox.',
    options: [
      { textFr: "Justifié", textEn: "Justified", isCorrect: true },
      { textFr: "Publié", textEn: "Published", isCorrect: false },
      { textFr: "Urgent", textEn: "Urgent", isCorrect: false },
      { textFr: "Confidentiel", textEn: "Confidential", isCorrect: false },
    ],
  },
  {
    order: 12,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      'Enregistrez un événement de type "Sanction" sans renseigner de motif : que se passe-t-il ?',
    textEn:
      'Try saving a "Sanction" event without filling in a reason: what happens?',
    hintFr: "Un des champs est strictement obligatoire.",
    hintEn: "One of the fields is strictly required.",
    explanationFr:
      "L'enregistrement est refusé tant que le motif n'est pas renseigné.",
    explanationEn: "The save is rejected until the reason is filled in.",
    options: [
      {
        textFr: "L'enregistrement est refusé",
        textEn: "The save is rejected",
        isCorrect: true,
      },
      {
        textFr: "L'événement est enregistré sans motif",
        textEn: "The event is saved without a reason",
        isCorrect: false,
      },
      {
        textFr: "Un motif par défaut est ajouté automatiquement",
        textEn: "A default reason is added automatically",
        isCorrect: false,
      },
      {
        textFr: "L'élève est automatiquement notifié",
        textEn: "The student is automatically notified",
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
      "Ouvrez l'onglet Historique de l'élève sur lequel vous venez de signaler un événement : le nouvel événement y apparaît-il immédiatement ?",
    textEn:
      "Open the History tab for the student you just reported an event for: does the new event appear there immediately?",
    hintFr: "L'historique reflète en direct la saisie.",
    hintEn: "The history reflects the entry live.",
    explanationFr: "Vrai : l'historique se met à jour dès l'enregistrement.",
    explanationEn: "True: the history updates as soon as it is saved.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 14,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Modifiez un événement existant depuis l'Historique : quel bouton devez-vous utiliser pour enregistrer vos corrections ?",
    textEn:
      "Edit an existing event from History: which button must you use to save your corrections?",
    hintFr: "Son libellé diffère de celui utilisé à la création.",
    hintEn: "Its label differs from the one used at creation.",
    explanationFr: '"Enregistrer les modifications".',
    explanationEn: '"Save changes".',
    options: [
      {
        textFr: "Enregistrer les modifications",
        textEn: "Save changes",
        isCorrect: true,
      },
      {
        textFr: "Enregistrer l'événement",
        textEn: "Save event",
        isCorrect: false,
      },
      {
        textFr: "Signaler",
        textEn: "Report",
        isCorrect: false,
      },
      {
        textFr: "Publier",
        textEn: "Publish",
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
      "Essayez de supprimer un événement : une confirmation vous est-elle demandée avant la suppression définitive ?",
    textEn:
      "Try deleting an event: are you asked to confirm before it is permanently deleted?",
    hintFr: "La suppression est une action irréversible.",
    hintEn: "Deletion is an irreversible action.",
    explanationFr:
      "Vrai : une boîte de confirmation s'affiche avant toute suppression.",
    explanationEn: "True: a confirmation dialog appears before any deletion.",
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
      "Renseignez une punition avec une durée de 60 minutes : à quoi cette durée correspond-elle typiquement ?",
    textEn:
      "Fill in a punishment with a 60-minute duration: what does this duration typically represent?",
    hintFr: "Pensez à une retenue après les cours.",
    hintEn: "Think of a detention after class.",
    explanationFr: "Au temps de retenue ou de punition effectué par l'élève.",
    explanationEn: "The detention or punishment time served by the student.",
    options: [
      {
        textFr: "Le temps de retenue effectué",
        textEn: "The detention time served",
        isCorrect: true,
      },
      {
        textFr: "Le temps de trajet de l'élève",
        textEn: "The student's travel time",
        isCorrect: false,
      },
      {
        textFr: "La durée du cours concerné",
        textEn: "The duration of the related class",
        isCorrect: false,
      },
      {
        textFr: "Rien, ce champ n'a pas de sens ici",
        textEn: "Nothing, this field makes no sense here",
        isCorrect: false,
      },
    ],
  },
  {
    order: 17,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      'Pourquoi la case "Justifié" n\'apparaît-elle pas pour un événement de type "Sanction" ?',
    textEn:
      'Why doesn\'t the "Justified" checkbox appear for a "Sanction" event?',
    hintFr: "Une sanction n'est pas une absence de l'élève à un cours.",
    hintEn: "A sanction is not a student's absence from a class.",
    explanationFr:
      "Parce que la notion de justification ne s'applique qu'aux absences et retards, pas aux sanctions ou punitions.",
    explanationEn:
      "Because the notion of justification only applies to absences and latenesses, not to sanctions or punishments.",
    options: [
      {
        textFr: "La justification ne concerne que absences et retards",
        textEn: "Justification only concerns absences and latenesses",
        isCorrect: true,
      },
      {
        textFr: "C'est un oubli du formulaire",
        textEn: "It's a form oversight",
        isCorrect: false,
      },
      {
        textFr: "Les sanctions sont toujours justifiées",
        textEn: "Sanctions are always justified",
        isCorrect: false,
      },
      {
        textFr: "Les sanctions ne sont jamais enregistrées",
        textEn: "Sanctions are never recorded",
        isCorrect: false,
      },
    ],
  },
  {
    order: 18,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Les événements disciplinaires que vous saisissez sont visibles par les parents de l'élève concerné, pas seulement par l'administration.",
    textEn:
      "The discipline events you enter are visible to the concerned student's parents, not only to the administration.",
    hintFr: "Le module Discipline existe aussi côté parent.",
    hintEn: "The Discipline module also exists on the parent side.",
    explanationFr:
      "Vrai : les parents retrouvent ces événements dans leur propre module Discipline pour leur enfant.",
    explanationEn:
      "True: parents find these events in their own Discipline module for their child.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 19,
    type: "MCQ_MULTI",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Un même élève accumule plusieurs retards non justifiés dans son historique : quelles informations ce cumul permet-il de repérer ? (plusieurs réponses)",
    textEn:
      "A student accumulates several unjustified latenesses in their history: what does this pattern help spot? (select all that apply)",
    hintFr: "Pensez à ce qu'un enseignant ou l'administration en ferait.",
    hintEn:
      "Think about what a teacher or the administration would do with it.",
    explanationFr:
      "Une récurrence de comportement à signaler, et un dossier objectif en cas d'échange avec la famille.",
    explanationEn:
      "A recurring behaviour worth flagging, and an objective record for a conversation with the family.",
    options: [
      {
        textFr: "Une récurrence de comportement à signaler",
        textEn: "A recurring behaviour worth flagging",
        isCorrect: true,
      },
      {
        textFr: "Un dossier objectif pour échanger avec la famille",
        textEn: "An objective record for a family conversation",
        isCorrect: true,
      },
      {
        textFr: "La moyenne de l'élève dans la matière",
        textEn: "The student's average in the subject",
        isCorrect: false,
      },
      {
        textFr: "Le montant des frais de scolarité dus",
        textEn: "The amount of tuition fees due",
        isCorrect: false,
      },
    ],
  },
  {
    order: 20,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "La suppression d'un événement disciplinaire est une action réversible : il reste consultable en archive après suppression.",
    textEn:
      "Deleting a discipline event is reversible: it stays viewable as an archive after deletion.",
    hintFr:
      "Une confirmation est demandée précisément parce que ce n'est pas le cas.",
    hintEn:
      "A confirmation is requested precisely because this isn't the case.",
    explanationFr:
      "Faux : la suppression est définitive, d'où la confirmation demandée avant de valider.",
    explanationEn:
      "False: deletion is permanent, which is why a confirmation is required before validating it.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
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
