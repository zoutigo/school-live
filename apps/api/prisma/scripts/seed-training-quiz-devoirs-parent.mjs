import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const IMG = (name) => `/training-quiz/devoirs/${name}.svg`;

const CHAPTER = {
  role: "PARENT",
  moduleKey: "devoirs",
  order: 4,
  icon: "ClipboardList",
  colorFrom: "#F5A623",
  colorTo: "#C97C00",
  titleFr: "Devoirs",
  titleEn: "Homework",
  descriptionFr:
    "Découvrez comment suivre les devoirs de votre enfant : liste, échéances, pièces jointes et suivi de réalisation.",
  descriptionEn:
    "Discover how to follow your child's homework: list, deadlines, attachments and completion tracking.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: IMG("q1-fiche-enfant"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Où consultez-vous les devoirs de votre enfant ?",
    textEn: "Where do you check your child's homework?",
    hintFr:
      "Ouvrez la fiche de votre enfant, puis regardez les onglets disponibles en haut de page.",
    hintEn:
      "Open your child's profile, then look at the tabs available at the top of the page.",
    explanationFr:
      'Ouvrez la fiche de votre enfant puis l\'onglet "Devoirs" : vous y retrouvez la liste et le suivi de réalisation.',
    explanationEn:
      "Open your child's profile, then the \"Homework\" tab: you'll find the list and completion tracking there.",
    options: [
      {
        textFr: 'Dans l\'onglet "Devoirs" de la fiche de l\'enfant',
        textEn: 'In the "Homework" tab of the child\'s profile',
        isCorrect: true,
      },
      {
        textFr: "Dans la messagerie",
        textEn: "In the messaging inbox",
        isCorrect: false,
      },
      {
        textFr: "Dans les paramètres du compte",
        textEn: "In account settings",
        isCorrect: false,
      },
      {
        textFr: "Il faut appeler l'école",
        textEn: "You have to call the school",
        isCorrect: false,
      },
    ],
  },
  {
    order: 2,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: IMG("q2-notification"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr:
      "Un devoir en attente déclenche une pastille de notification sur l'entrée \"Devoirs\" du menu.",
    textEn:
      "A pending homework item triggers a notification badge on the \"Homework\" menu entry.",
    hintFr:
      "Repensez à ce qui se passe pour vos autres modules (notes, discipline) quand il y a du nouveau.",
    hintEn:
      "Think about what happens on your other modules (grades, discipline) when there's something new.",
    explanationFr:
      "Comme pour les notes ou la discipline, les devoirs non encore faits affichent une pastille sur l'entrée \"Devoirs\" jusqu'à ce qu'ils soient marqués faits.",
    explanationEn:
      'Just like grades or discipline, homework that is not yet done shows a badge on the "Homework" menu entry until it is marked done.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 3,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: IMG("q3-onglets"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: 'Le module Devoirs propose deux onglets. À quoi sert l\'onglet "Liste" ?',
    textEn: 'The Homework module has two tabs. What is the "List" tab for?',
    hintFr: "C'est l'onglet ouvert par défaut quand vous arrivez sur le module.",
    hintEn: "It's the tab open by default when you arrive on the module.",
    explanationFr:
      'L\'onglet "Liste" affiche les devoirs à venir, un par ligne, triés par échéance.',
    explanationEn:
      'The "List" tab shows upcoming homework items, one per row, sorted by deadline.',
    options: [
      {
        textFr: "Afficher les devoirs à venir, un par ligne",
        textEn: "Show upcoming homework items, one per row",
        isCorrect: true,
      },
      {
        textFr: "Afficher uniquement les devoirs déjà faits",
        textEn: "Show only homework already done",
        isCorrect: false,
      },
      {
        textFr: "Modifier les devoirs de la classe",
        textEn: "Edit the class's homework",
        isCorrect: false,
      },
      {
        textFr: "Contacter l'enseignant",
        textEn: "Contact the teacher",
        isCorrect: false,
      },
    ],
  },
  {
    order: 4,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: IMG("q4-onglet-voir"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: 'À quoi sert l\'onglet "Voir" du module Devoirs ?',
    textEn: 'What is the "View" tab of the Homework module for?',
    hintFr: "Il donne des chiffres, pas une liste détaillée.",
    hintEn: "It gives numbers, not a detailed list.",
    explanationFr:
      'L\'onglet "Voir" donne un résumé rapide : nombre total de devoirs, "à faire" et "en retard".',
    explanationEn:
      'The "View" tab gives a quick summary: total homework count, "to do" and "late".',
    options: [
      {
        textFr: "Donner un résumé chiffré (total, à faire, en retard)",
        textEn: "Give a summary with numbers (total, to do, late)",
        isCorrect: true,
      },
      {
        textFr: "Envoyer un message à l'enseignant",
        textEn: "Send a message to the teacher",
        isCorrect: false,
      },
      {
        textFr: "Ajouter un nouveau devoir",
        textEn: "Add a new homework item",
        isCorrect: false,
      },
      {
        textFr: "Changer la classe de l'enfant",
        textEn: "Change the child's class",
        isCorrect: false,
      },
    ],
  },
  {
    order: 5,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: IMG("q5-tri"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Dans l'onglet Liste, les devoirs sont triés par échéance la plus proche en premier.",
    textEn: "In the List tab, homework items are sorted with the closest deadline first.",
    hintFr: "Pensez à l'ordre le plus utile pour ne rien oublier.",
    hintEn: "Think about the order that is most useful so nothing gets forgotten.",
    explanationFr:
      "La liste est triée par échéance croissante : le devoir le plus urgent apparaît en haut.",
    explanationEn:
      "The list is sorted by ascending deadline: the most urgent homework appears at the top.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 6,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: IMG("q6-statuts"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Quels sont les trois statuts possibles pour un devoir ?",
    textEn: "What are the three possible statuses for a homework item?",
    hintFr: "Un statut pour ce qui reste à faire, un pour ce qui est fait, un pour ce qui a dépassé la date.",
    hintEn: "One status for what's left to do, one for what's done, one for what's past due.",
    explanationFr:
      'Un devoir peut être "À faire", "En retard" (échéance dépassée, non fait) ou "Validé" (marqué fait).',
    explanationEn:
      'A homework item can be "To do", "Late" (deadline passed, not done) or "Validated" (marked done).',
    options: [
      {
        textFr: "À faire, En retard, Validé",
        textEn: "To do, Late, Validated",
        isCorrect: true,
      },
      {
        textFr: "Facile, Moyen, Difficile",
        textEn: "Easy, Medium, Hard",
        isCorrect: false,
      },
      {
        textFr: "Brouillon, Publié, Archivé",
        textEn: "Draft, Published, Archived",
        isCorrect: false,
      },
      {
        textFr: "Urgent, Important, Optionnel",
        textEn: "Urgent, Important, Optional",
        isCorrect: false,
      },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: IMG("q7-en-retard"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: 'Que signifie le statut "En retard" pour un devoir ?',
    textEn: 'What does the "Late" status mean for a homework item?',
    hintFr: "Regardez à la fois la date d'échéance et l'état de réalisation.",
    hintEn: "Look at both the deadline and the completion state.",
    explanationFr:
      "Un devoir passe en \"En retard\" quand la date d'échéance est dépassée et qu'il n'a pas été marqué fait.",
    explanationEn:
      'A homework item becomes "Late" when its deadline has passed and it has not been marked as done.',
    options: [
      {
        textFr: "L'échéance est dépassée et le devoir n'est pas marqué fait",
        textEn: "The deadline has passed and the homework is not marked done",
        isCorrect: true,
      },
      {
        textFr: "L'enseignant a publié le devoir en retard",
        textEn: "The teacher published the homework late",
        isCorrect: false,
      },
      {
        textFr: "Le devoir a été refusé",
        textEn: "The homework was rejected",
        isCorrect: false,
      },
      {
        textFr: "Il manque une pièce jointe",
        textEn: "An attachment is missing",
        isCorrect: false,
      },
    ],
  },
  {
    order: 8,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: IMG("q8-detail"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Cliquer sur un devoir de la liste ouvre la consigne complète et les pièces jointes.",
    textEn: "Clicking a homework item in the list opens the full instructions and attachments.",
    hintFr: "La ligne de liste n'est qu'un résumé : titre, matière, échéance, statut.",
    hintEn: "The list row is only a summary: title, subject, deadline, status.",
    explanationFr:
      "En cliquant sur un devoir, vous ouvrez son détail complet : consignes, pièces jointes et commentaires.",
    explanationEn:
      "Clicking a homework item opens its full detail: instructions, attachments and comments.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 9,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: IMG("q9-contenu-detail"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Quels éléments retrouve-t-on dans le détail d'un devoir ? (plusieurs réponses)",
    textEn: "Which elements do you find in a homework item's detail? (multiple answers)",
    hintFr: "Pensez à ce qu'un enseignant peut donner comme consigne et fournir comme document.",
    hintEn: "Think about what a teacher can give as instructions and provide as documents.",
    explanationFr:
      "Le détail d'un devoir regroupe les consignes, les éventuelles pièces jointes et les commentaires échangés.",
    explanationEn:
      "A homework item's detail groups the instructions, any attachments and the comments exchanged.",
    options: [
      { textFr: "Les consignes", textEn: "The instructions", isCorrect: true },
      {
        textFr: "Les pièces jointes",
        textEn: "The attachments",
        isCorrect: true,
      },
      {
        textFr: "Les commentaires",
        textEn: "The comments",
        isCorrect: true,
      },
      {
        textFr: "La moyenne de la classe",
        textEn: "The class average",
        isCorrect: false,
      },
    ],
  },
  {
    order: 10,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: IMG("q10-echeance"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Dans la liste, quelle information est affichée avec le préfixe \"Pour le\" ?",
    textEn: 'In the list, which information is shown with the "Due" prefix?',
    hintFr: "C'est la date à ne pas dépasser.",
    hintEn: "It's the date not to miss.",
    explanationFr:
      "Le préfixe \"Pour le\" précède la date d'échéance du devoir dans la liste.",
    explanationEn:
      'The "Due" prefix precedes the homework deadline shown in the list.',
    options: [
      {
        textFr: "La date d'échéance du devoir",
        textEn: "The homework's deadline",
        isCorrect: true,
      },
      {
        textFr: "La date de création du devoir",
        textEn: "The homework's creation date",
        isCorrect: false,
      },
      {
        textFr: "La date du dernier commentaire",
        textEn: "The date of the last comment",
        isCorrect: false,
      },
      {
        textFr: "La date de naissance de l'enfant",
        textEn: "The child's date of birth",
        isCorrect: false,
      },
    ],
  },
  {
    order: 11,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: IMG("q11-onglet-voir-chiffres"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr:
      "Ouvrez le module Devoirs de votre enfant et regardez l'onglet \"Voir\" : combien de devoirs sont actuellement \"En retard\" ?",
    textEn:
      'Open your child\'s Homework module and check the "View" tab: how many homework items are currently "Late"?',
    hintFr: "Ouvrez l'onglet \"Voir\" et lisez le chiffre associé à \"En retard\".",
    hintEn: 'Open the "View" tab and read the number next to "Late".',
    explanationFr:
      "L'onglet \"Voir\" affiche en direct le nombre de devoirs en retard pour votre enfant, à consulter régulièrement.",
    explanationEn:
      'The "View" tab shows a live count of late homework for your child, worth checking regularly.',
    options: [
      {
        textFr: "Le chiffre affiché dans l'onglet \"Voir\" en face de \"En retard\"",
        textEn: 'The number shown in the "View" tab next to "Late"',
        isCorrect: true,
      },
      {
        textFr: "Il faut compter les lignes rouges dans la liste",
        textEn: "You have to count the red rows in the list",
        isCorrect: false,
      },
      {
        textFr: "Ce chiffre n'existe pas",
        textEn: "This number does not exist",
        isCorrect: false,
      },
      {
        textFr: "Il faut demander à l'enseignant",
        textEn: "You have to ask the teacher",
        isCorrect: false,
      },
    ],
  },
  {
    order: 12,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: IMG("q12-prochain-devoir"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr:
      "Ouvrez l'onglet \"Liste\" : quelle est la matière du devoir affiché en tout premier ?",
    textEn: 'Open the "List" tab: what subject is the very first homework item shown?',
    hintFr: "Le premier de la liste est celui dont l'échéance est la plus proche.",
    hintEn: "The first one in the list is the one with the closest deadline.",
    explanationFr:
      "Comme la liste est triée par échéance croissante, la première ligne correspond au devoir le plus urgent, avec sa matière indiquée dans la colonne \"Matière\".",
    explanationEn:
      "Since the list is sorted by ascending deadline, the first row is the most urgent homework, with its subject shown in the \"Subject\" column.",
    options: [
      {
        textFr: "La matière indiquée sur la première ligne de la liste",
        textEn: "The subject shown on the first row of the list",
        isCorrect: true,
      },
      {
        textFr: "Toujours les mathématiques",
        textEn: "Always mathematics",
        isCorrect: false,
      },
      {
        textFr: "La matière préférée de l'enfant",
        textEn: "The child's favourite subject",
        isCorrect: false,
      },
      {
        textFr: "Il n'y a pas de matière associée",
        textEn: "There is no subject associated",
        isCorrect: false,
      },
    ],
  },
  {
    order: 13,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: IMG("q13-marquer-fait"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr:
      "Ouvrez un devoir puis cliquez sur \"Marquer fait\" : que se passe-t-il ?",
    textEn: 'Open a homework item then click "Mark done": what happens?',
    hintFr: "Le statut du devoir change, et le libellé du bouton aussi.",
    hintEn: "The homework status changes, and so does the button's label.",
    explanationFr:
      'Le devoir passe au statut "Validé" et le bouton devient "Marquer non fait" pour permettre d\'annuler.',
    explanationEn:
      'The homework switches to "Validated" status and the button becomes "Mark not done" so it can be undone.',
    options: [
      {
        textFr: 'Le devoir passe "Validé" et le bouton devient "Marquer non fait"',
        textEn: 'The homework becomes "Validated" and the button becomes "Mark not done"',
        isCorrect: true,
      },
      {
        textFr: "Le devoir est supprimé de la liste",
        textEn: "The homework is removed from the list",
        isCorrect: false,
      },
      {
        textFr: "Un message est automatiquement envoyé à l'enseignant",
        textEn: "A message is automatically sent to the teacher",
        isCorrect: false,
      },
      {
        textFr: "Rien ne change avant validation de l'enseignant",
        textEn: "Nothing changes until the teacher validates it",
        isCorrect: false,
      },
    ],
  },
  {
    order: 14,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: IMG("q14-annuler"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Vous pouvez annuler un \"Marquer fait\" en cliquant à nouveau sur le bouton.",
    textEn: 'You can undo a "Mark done" by clicking the button again.',
    hintFr: "Le bouton change de libellé une fois le devoir marqué fait.",
    hintEn: "The button's label changes once the homework is marked done.",
    explanationFr:
      "Le bouton bascule entre \"Marquer fait\" et \"Marquer non fait\" : une erreur de manipulation reste réversible.",
    explanationEn:
      'The button toggles between "Mark done" and "Mark not done": a mistaken tap stays reversible.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 15,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: IMG("q15-commentaire"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Comment ajouter un commentaire sur un devoir depuis l'application ?",
    textEn: "How do you add a comment on a homework item from the app?",
    hintFr: "Ouvrez le détail du devoir et cherchez la zone de saisie en bas.",
    hintEn: "Open the homework's detail and look for the input area at the bottom.",
    explanationFr:
      "Ouvrez le détail du devoir : une zone \"Commentaires\" en bas de page permet d'écrire et d'envoyer un message.",
    explanationEn:
      'Open the homework detail: a "Comments" area at the bottom of the page lets you write and send a message.',
    options: [
      {
        textFr: "Ouvrir le devoir puis écrire dans la zone Commentaires",
        textEn: "Open the homework then write in the Comments area",
        isCorrect: true,
      },
      {
        textFr: "Envoyer un email à l'école",
        textEn: "Send an email to the school",
        isCorrect: false,
      },
      {
        textFr: "Passer par la messagerie de l'école, ce module n'a pas de commentaires",
        textEn: "Go through the school's messaging, this module has no comments",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas possible pour un parent",
        textEn: "This is not possible for a parent",
        isCorrect: false,
      },
    ],
  },
  {
    order: 16,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: IMG("q16-pieces-jointes"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Où retrouvez-vous les documents fournis par l'enseignant pour un devoir ?",
    textEn: "Where do you find the documents provided by the teacher for a homework item?",
    hintFr: "Ouvrez le détail du devoir et cherchez une section dédiée aux fichiers.",
    hintEn: "Open the homework's detail and look for a section dedicated to files.",
    explanationFr:
      'Le détail du devoir contient une section "Pièces jointes" regroupant les documents fournis.',
    explanationEn:
      'The homework detail has an "Attachments" section grouping the documents provided.',
    options: [
      {
        textFr: 'Dans la section "Pièces jointes" du détail du devoir',
        textEn: 'In the "Attachments" section of the homework detail',
        isCorrect: true,
      },
      {
        textFr: "Dans le module Documents de l'école",
        textEn: "In the school's Documents module",
        isCorrect: false,
      },
      {
        textFr: "Dans la messagerie",
        textEn: "In the messaging inbox",
        isCorrect: false,
      },
      {
        textFr: "Il faut les demander par téléphone",
        textEn: "You have to ask for them by phone",
        isCorrect: false,
      },
    ],
  },
  {
    order: 17,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: IMG("q17-total-devoirs"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Où trouvez-vous le nombre total de devoirs suivis pour votre enfant ?",
    textEn: "Where do you find the total number of homework items tracked for your child?",
    hintFr: "C'est un des trois chiffres affichés dans le résumé.",
    hintEn: "It's one of the three numbers shown in the summary.",
    explanationFr:
      "L'onglet \"Voir\" affiche le total des devoirs suivis, à côté des compteurs \"À faire\" et \"En retard\".",
    explanationEn:
      'The "View" tab shows the total tracked homework count, alongside the "To do" and "Late" counters.',
    options: [
      {
        textFr: "Dans l'onglet \"Voir\", à côté de \"Devoirs\"",
        textEn: 'In the "View" tab, next to "Homework"',
        isCorrect: true,
      },
      {
        textFr: "Dans les paramètres du compte",
        textEn: "In account settings",
        isCorrect: false,
      },
      {
        textFr: "Il faut compter soi-même les lignes de la liste",
        textEn: "You have to count the list rows yourself",
        isCorrect: false,
      },
      {
        textFr: "Ce total n'est pas disponible",
        textEn: "This total is not available",
        isCorrect: false,
      },
    ],
  },
  {
    order: 18,
    type: "MCQ_MULTI",
    stage: "PRACTICE",
    image: IMG("q18-colonnes-liste"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Ouvrez l'onglet \"Liste\" : quelles colonnes voyez-vous pour chaque devoir ? (plusieurs réponses)",
    textEn: 'Open the "List" tab: which columns do you see for each homework item? (multiple answers)',
    hintFr: "Regardez l'en-tête du tableau.",
    hintEn: "Look at the table header.",
    explanationFr:
      "Chaque ligne affiche le titre, la matière, l'échéance et le statut du devoir.",
    explanationEn:
      "Each row shows the homework's title, subject, deadline and status.",
    options: [
      { textFr: "Titre", textEn: "Title", isCorrect: true },
      { textFr: "Matière", textEn: "Subject", isCorrect: true },
      { textFr: "Échéance", textEn: "Deadline", isCorrect: true },
      { textFr: "Statut", textEn: "Status", isCorrect: true },
    ],
  },
  {
    order: 19,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: IMG("q19-nombre-commentaires"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Le nombre de commentaires d'un devoir est visible directement dans la liste, sans ouvrir le détail.",
    textEn: "The number of comments on a homework item is visible directly in the list, without opening the detail.",
    hintFr: "Regardez attentivement les colonnes de la liste : Titre, Matière, Échéance, Statut.",
    hintEn: "Look carefully at the list's columns: Title, Subject, Deadline, Status.",
    explanationFr:
      "La liste n'affiche que le titre, la matière, l'échéance et le statut : il faut ouvrir le devoir pour voir ses commentaires.",
    explanationEn:
      "The list only shows the title, subject, deadline and status: you have to open the homework item to see its comments.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 20,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: IMG("q20-aide"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Comment retrouver de l'aide sur le module Devoirs à tout moment ?",
    textEn: "How do you find help on the Homework module at any time?",
    hintFr: "Ce n'est pas un menu global : regardez les onglets du module lui-même.",
    hintEn: "It's not a global menu: look at the module's own tabs.",
    explanationFr:
      'Le module Devoirs a son propre onglet "Aide", à côté de "Liste" et "Voir", à ouvrir à tout moment.',
    explanationEn:
      'The Homework module has its own "Help" tab, next to "List" and "View", that you can open at any time.',
    options: [
      {
        textFr: 'Ouvrir l\'onglet "Aide" du module',
        textEn: 'Open the module\'s "Help" tab',
        isCorrect: true,
      },
      {
        textFr: "Appeler le support technique",
        textEn: "Call technical support",
        isCorrect: false,
      },
      {
        textFr: "Il n'y a pas d'aide disponible sur ce module",
        textEn: "There is no help available on this module",
        isCorrect: false,
      },
      {
        textFr: "Redémarrer l'application",
        textEn: "Restart the app",
        isCorrect: false,
      },
    ],
  },
  {
    order: 21,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: IMG("q21-scenario-retard"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr:
      "L'échéance d'un devoir est passée hier et votre enfant ne l'a pas marqué fait. Quel statut voyez-vous aujourd'hui ?",
    textEn:
      "A homework's deadline was yesterday and your child has not marked it done. What status do you see today?",
    hintFr: "Combinez la date d'échéance et l'état de réalisation.",
    hintEn: "Combine the deadline and the completion state.",
    explanationFr:
      '"En retard" : l\'échéance est dépassée et le devoir n\'a pas été marqué fait.',
    explanationEn:
      '"Late": the deadline has passed and the homework has not been marked done.',
    options: [
      { textFr: "En retard", textEn: "Late", isCorrect: true },
      { textFr: "À faire", textEn: "To do", isCorrect: false },
      { textFr: "Validé", textEn: "Validated", isCorrect: false },
      { textFr: "Archivé", textEn: "Archived", isCorrect: false },
    ],
  },
  {
    order: 22,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: IMG("q22-scenario-fait-avant"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr:
      "Votre enfant a marqué un devoir fait la veille de l'échéance. Quel statut est affiché ?",
    textEn:
      "Your child marked a homework item done the day before its deadline. What status is shown?",
    hintFr: "Le statut \"Validé\" est indépendant de la date une fois le devoir marqué fait.",
    hintEn: 'The "Validated" status is independent from the date once the homework is marked done.',
    explanationFr:
      "Dès qu'un devoir est marqué fait, il passe \"Validé\", même si l'échéance n'est pas encore arrivée.",
    explanationEn:
      'As soon as a homework item is marked done, it becomes "Validated", even if the deadline has not passed yet.',
    options: [
      { textFr: "Validé", textEn: "Validated", isCorrect: true },
      { textFr: "En retard", textEn: "Late", isCorrect: false },
      { textFr: "À faire", textEn: "To do", isCorrect: false },
      { textFr: "En attente de correction", textEn: "Pending review", isCorrect: false },
    ],
  },
  {
    order: 23,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: IMG("q23-liste-vs-voir"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Quelle est la différence essentielle entre l'onglet \"Liste\" et l'onglet \"Voir\" ?",
    textEn: 'What is the essential difference between the "List" tab and the "View" tab?',
    hintFr: "L'un détaille devoir par devoir, l'autre synthétise en chiffres.",
    hintEn: "One details homework item by item, the other summarises with numbers.",
    explanationFr:
      '"Liste" détaille chaque devoir à venir ; "Voir" en donne une synthèse chiffrée (total, à faire, en retard) pour prioriser rapidement.',
    explanationEn:
      '"List" details each upcoming homework item; "View" gives a numeric summary (total, to do, late) to prioritise quickly.',
    options: [
      {
        textFr: "\"Liste\" détaille chaque devoir, \"Voir\" donne une synthèse chiffrée",
        textEn: '"List" details each item, "View" gives a numeric summary',
        isCorrect: true,
      },
      {
        textFr: "Les deux onglets affichent exactement la même chose",
        textEn: "Both tabs show exactly the same thing",
        isCorrect: false,
      },
      {
        textFr: "\"Voir\" sert uniquement à l'enseignant",
        textEn: '"View" is only for the teacher',
        isCorrect: false,
      },
      {
        textFr: "\"Liste\" ne montre que les devoirs en retard",
        textEn: '"List" only shows late homework',
        isCorrect: false,
      },
    ],
  },
  {
    order: 24,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: IMG("q24-parent-peut-marquer"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "En tant que parent, vous pouvez marquer un devoir de votre enfant comme fait.",
    textEn: "As a parent, you can mark your child's homework as done.",
    hintFr: "Le bouton \"Marquer fait\" est disponible dans le détail du devoir, quel que soit le compte connecté (élève ou parent).",
    hintEn: 'The "Mark done" button is available in the homework detail, whether the connected account is a student or a parent.',
    explanationFr:
      "Le bouton \"Marquer fait\" fonctionne aussi depuis le compte d'un parent consultant les devoirs de son enfant.",
    explanationEn:
      "The \"Mark done\" button also works from a parent's account viewing their child's homework.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 25,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: IMG("q25-pourquoi-voir"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Pourquoi consulter régulièrement l'onglet \"Voir\" plutôt que la liste complète ?",
    textEn: 'Why check the "View" tab regularly rather than the full list?',
    hintFr: "Pensez à ce qui vous permet de réagir vite sans tout relire.",
    hintEn: "Think about what lets you react quickly without re-reading everything.",
    explanationFr:
      "Le compteur \"En retard\" de l'onglet \"Voir\" permet de repérer immédiatement un problème sans parcourir toute la liste.",
    explanationEn:
      'The "Late" counter in the "View" tab lets you immediately spot an issue without going through the whole list.',
    options: [
      {
        textFr: "Pour repérer immédiatement un devoir en retard sans tout relire",
        textEn: "To immediately spot a late homework item without re-reading everything",
        isCorrect: true,
      },
      {
        textFr: "Parce que la liste ne fonctionne pas sur mobile",
        textEn: "Because the list does not work on mobile",
        isCorrect: false,
      },
      {
        textFr: "Pour changer la classe de l'enfant",
        textEn: "To change the child's class",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas utile, les deux onglets sont identiques",
        textEn: "It's not useful, both tabs are identical",
        isCorrect: false,
      },
    ],
  },
  {
    order: 26,
    type: "MCQ_MULTI",
    stage: "MASTERY",
    image: IMG("q26-actions-parent"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Quelles actions un parent peut-il réaliser sur un devoir ? (plusieurs réponses)",
    textEn: "Which actions can a parent perform on a homework item? (multiple answers)",
    hintFr: "Un parent peut réagir au devoir, pas le rédiger.",
    hintEn: "A parent can react to the homework, not write it.",
    explanationFr:
      "Un parent peut marquer un devoir fait ou non fait, ajouter un commentaire et consulter les pièces jointes — mais pas modifier la consigne, réservée à l'enseignant.",
    explanationEn:
      "A parent can mark a homework item done or not done, add a comment and view attachments — but cannot edit the instructions, which stay reserved to the teacher.",
    options: [
      {
        textFr: "Marquer fait / non fait",
        textEn: "Mark done / not done",
        isCorrect: true,
      },
      {
        textFr: "Ajouter un commentaire",
        textEn: "Add a comment",
        isCorrect: true,
      },
      {
        textFr: "Consulter les pièces jointes",
        textEn: "View the attachments",
        isCorrect: true,
      },
      {
        textFr: "Modifier la consigne du devoir",
        textEn: "Edit the homework's instructions",
        isCorrect: false,
      },
    ],
  },
  {
    order: 27,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: IMG("q27-parent-ne-modifie-pas"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Un parent peut modifier la consigne d'un devoir rédigée par l'enseignant.",
    textEn: "A parent can edit a homework's instructions written by the teacher.",
    hintFr: "Un parent peut réagir (commentaire, statut) mais pas réécrire le contenu pédagogique.",
    hintEn: "A parent can react (comment, status) but not rewrite the teaching content.",
    explanationFr:
      "La rédaction et la modification de la consigne restent réservées à l'enseignant ; le parent peut seulement commenter et suivre l'état du devoir.",
    explanationEn:
      "Writing and editing the instructions stay reserved to the teacher; the parent can only comment and follow the homework's state.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 28,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: IMG("q28-badge-apres-validation"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr:
      "Votre enfant marque son dernier devoir en attente comme fait. Que devient la pastille de notification \"Devoirs\" ?",
    textEn:
      "Your child marks their last pending homework as done. What happens to the \"Homework\" notification badge?",
    hintFr: "La pastille reflète le nombre de devoirs non encore faits.",
    hintEn: "The badge reflects the number of homework items not yet done.",
    explanationFr:
      "Comme la pastille compte les devoirs non faits, elle disparaît dès qu'il n'en reste plus aucun.",
    explanationEn:
      "Since the badge counts homework not yet done, it disappears as soon as none is left.",
    options: [
      { textFr: "Elle disparaît", textEn: "It disappears", isCorrect: true },
      {
        textFr: "Elle reste affichée avec le même nombre",
        textEn: "It stays displayed with the same number",
        isCorrect: false,
      },
      {
        textFr: "Elle passe au rouge",
        textEn: "It turns red",
        isCorrect: false,
      },
      {
        textFr: "Elle ne change qu'après validation de l'enseignant",
        textEn: "It only changes after the teacher validates it",
        isCorrect: false,
      },
    ],
  },
  {
    order: 29,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: IMG("q29-nouveau-devoir"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr: "Quel est le moyen le plus rapide de savoir qu'un nouveau devoir a été publié depuis votre dernière visite ?",
    textEn: "What is the fastest way to know a new homework item was published since your last visit?",
    hintFr: "Pas besoin d'ouvrir le module pour le savoir.",
    hintEn: "You don't need to open the module to know it.",
    explanationFr:
      "La pastille de notification sur l'entrée \"Devoirs\" du menu signale un devoir non encore consulté ou non fait, sans avoir à ouvrir le module.",
    explanationEn:
      'The notification badge on the "Homework" menu entry signals an unread or not-yet-done homework item, without opening the module.',
    options: [
      {
        textFr: "Repérer la pastille sur l'entrée \"Devoirs\" du menu",
        textEn: 'Spot the badge on the "Homework" menu entry',
        isCorrect: true,
      },
      {
        textFr: "Attendre un email de l'école",
        textEn: "Wait for an email from the school",
        isCorrect: false,
      },
      {
        textFr: "Ouvrir chaque devoir un par un chaque jour",
        textEn: "Open every homework item one by one each day",
        isCorrect: false,
      },
      {
        textFr: "Il n'existe aucun signal, il faut vérifier au hasard",
        textEn: "There is no signal, you have to check at random",
        isCorrect: false,
      },
    ],
  },
  {
    order: 30,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: IMG("q30-scenario-complet"),
    deepLinkRoute: "/children/{childId}/cahier-de-texte",
    textFr:
      "Un devoir a 2 pièces jointes et 3 commentaires, n'est pas encore fait, et son échéance est demain. Dans quel compteur de l'onglet \"Voir\" est-il comptabilisé, et quel statut porte-t-il dans la liste ?",
    textEn:
      "A homework item has 2 attachments and 3 comments, is not yet done, and its deadline is tomorrow. Which counter in the \"View\" tab includes it, and what status does it carry in the list?",
    hintFr: "L'échéance n'est pas encore dépassée : ce n'est donc pas \"En retard\".",
    hintEn: 'The deadline has not passed yet: so it is not "Late".',
    explanationFr:
      "Tant que l'échéance n'est pas dépassée et que le devoir n'est pas marqué fait, il compte dans \"À faire\" et affiche le statut \"À faire\" dans la liste, quel que soit son nombre de pièces jointes ou de commentaires.",
    explanationEn:
      'As long as the deadline has not passed and the homework is not marked done, it counts under "To do" and shows the "To do" status in the list, regardless of its number of attachments or comments.',
    options: [
      {
        textFr: "Compteur \"À faire\", statut \"À faire\"",
        textEn: '"To do" counter, "To do" status',
        isCorrect: true,
      },
      {
        textFr: "Compteur \"En retard\", statut \"En retard\"",
        textEn: '"Late" counter, "Late" status',
        isCorrect: false,
      },
      {
        textFr: "Compteur \"Devoirs\" uniquement, statut \"Validé\"",
        textEn: '"Homework" counter only, "Validated" status',
        isCorrect: false,
      },
      {
        textFr: "Aucun compteur, car il a des pièces jointes et des commentaires",
        textEn: "No counter, because it has attachments and comments",
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
