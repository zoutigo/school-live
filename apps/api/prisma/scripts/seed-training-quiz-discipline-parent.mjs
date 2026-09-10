import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const IMG = (name) => `/training-quiz/discipline/${name}.svg`;

const CHAPTER = {
  role: "PARENT",
  moduleKey: "discipline",
  order: 1,
  icon: "ShieldCheck",
  colorFrom: "#3DA5F5",
  colorTo: "#207FD5",
  titleFr: "Discipline",
  titleEn: "Discipline",
  descriptionFr:
    "Découvrez comment suivre le comportement de votre enfant à l'école : sanctions, avertissements et mentions positives.",
  descriptionEn:
    "Discover how to follow your child's behaviour at school: sanctions, warnings and positive mentions.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    difficulty: "EASY",
    image: IMG("q1-fiche-enfant"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr: "Où consultez-vous le comportement disciplinaire de votre enfant ?",
    textEn: "Where do you check your child's disciplinary record?",
    hintFr:
      "Ouvrez la fiche de votre enfant, puis regardez les onglets disponibles en haut de page.",
    hintEn:
      "Open your child's profile, then look at the tabs available at the top of the page.",
    explanationFr:
      'Ouvrez la fiche de votre enfant puis l\'onglet "Discipline" : vous y retrouvez sanctions, avertissements et mentions positives.',
    explanationEn:
      "Open your child's profile, then the \"Discipline\" tab: you'll find sanctions, warnings and positive mentions there.",
    options: [
      {
        textFr: "Dans l'onglet \"Discipline\" de la fiche de l'enfant",
        textEn: 'In the "Discipline" tab of the child\'s profile',
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
    difficulty: "EASY",
    image: IMG("q2-notification"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Un nouvel évènement disciplinaire déclenche une pastille de notification dans le menu.",
    textEn:
      "A new disciplinary event triggers a notification badge in the menu.",
    hintFr:
      "Repensez à ce qui se passe pour vos autres modules (notes, messages) quand il y a du nouveau.",
    hintEn:
      "Think about what happens on your other modules (grades, messages) when there's something new.",
    explanationFr:
      "Comme pour les notes ou les messages, un évènement disciplinaire non lu affiche une pastille rouge sur l'entrée \"Discipline\" jusqu'à consultation.",
    explanationEn:
      'Just like grades or messages, an unread disciplinary event shows a red badge on the "Discipline" menu entry until you view it.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 3,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: IMG("q3-mention-positive"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr: 'Que signifie une "mention positive" dans le module Discipline ?',
    textEn: 'What does a "positive mention" mean in the Discipline module?',
    hintFr: "Le module Discipline ne sert pas qu'à signaler des sanctions.",
    hintEn: "The Discipline module isn't only there to report sanctions.",
    explanationFr:
      "Le module ne sert pas qu'à signaler des sanctions : il valorise aussi les comportements exemplaires grâce aux mentions positives.",
    explanationEn:
      "The module isn't only for sanctions: it also highlights exemplary behaviour through positive mentions.",
    options: [
      {
        textFr: "Une reconnaissance d'un comportement exemplaire",
        textEn: "A recognition of exemplary behaviour",
        isCorrect: true,
      },
      {
        textFr: "Une sanction déguisée",
        textEn: "A disguised sanction",
        isCorrect: false,
      },
      {
        textFr: "Un rappel du règlement intérieur",
        textEn: "A reminder of school rules",
        isCorrect: false,
      },
      {
        textFr: "Une absence justifiée",
        textEn: "An excused absence",
        isCorrect: false,
      },
    ],
  },
  {
    order: 4,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: IMG("q4-historique"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr: "Comment retrouver l'historique disciplinaire complet de l'année ?",
    textEn: "How do you find the full disciplinary history for the year?",
    hintFr:
      "Le tableau du module Discipline n'affiche pas qu'un seul évènement.",
    hintEn: "The Discipline module table doesn't show just one event.",
    explanationFr:
      "Le tableau du module Discipline liste chronologiquement tous les évènements de l'année scolaire, pas seulement le dernier.",
    explanationEn:
      "The Discipline module table lists every event of the school year chronologically, not just the latest one.",
    options: [
      {
        textFr:
          "Le tableau du module Discipline liste tous les évènements avec leur date",
        textEn: "The Discipline module table lists every event with its date",
        isCorrect: true,
      },
      {
        textFr: "Seul le dernier évènement est visible",
        textEn: "Only the latest event is visible",
        isCorrect: false,
      },
      {
        textFr: "Il faut contacter l'administration à chaque fois",
        textEn: "You must contact the school office every time",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas disponible côté parent",
        textEn: "This isn't available to parents",
        isCorrect: false,
      },
    ],
  },
  {
    order: 5,
    type: "MCQ_MULTI",
    difficulty: "HARD",
    image: IMG("q5-fiche-evenement"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Quelles informations retrouve-t-on sur la fiche d'un évènement disciplinaire ? (plusieurs réponses)",
    textEn:
      "Which details appear on a disciplinary event card? (select all that apply)",
    hintFr:
      "Pensez aux informations utiles à un parent, jamais à des données confidentielles d'un enseignant.",
    hintEn:
      "Think about what's useful to a parent, never a teacher's confidential data.",
    explanationFr:
      "Chaque évènement affiche sa date, son type (sanction/avertissement/mention) et le motif renseigné par l'établissement — jamais d'informations sensibles comme un mot de passe.",
    explanationEn:
      "Each event shows its date, type (sanction/warning/mention) and the reason given by the school — never sensitive data such as a password.",
    options: [
      {
        textFr: "La date de l'évènement",
        textEn: "The event date",
        isCorrect: true,
      },
      {
        textFr: "Le motif renseigné par l'école",
        textEn: "The reason given by the school",
        isCorrect: true,
      },
      {
        textFr: "Le type d'évènement (sanction, avertissement, mention)",
        textEn: "The event type (sanction, warning, mention)",
        isCorrect: true,
      },
      {
        textFr: "Le mot de passe de l'enseignant",
        textEn: "The teacher's password",
        isCorrect: false,
      },
    ],
  },
  {
    order: 6,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: IMG("q6-messagerie"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Vous avez une question sur un évènement disciplinaire : quelle est la meilleure action ?",
    textEn:
      "You have a question about a disciplinary event: what's the best action?",
    hintFr:
      "Il existe un canal direct pour écrire à l'école depuis l'application.",
    hintEn: "There's a direct channel to message the school from the app.",
    explanationFr:
      "La messagerie interne relie directement les familles à l'établissement : c'est le canal prévu pour échanger sur un évènement disciplinaire.",
    explanationEn:
      "In-app messaging connects families directly with the school: it's the intended channel to discuss a disciplinary event.",
    options: [
      {
        textFr: "Écrire à l'école via la messagerie",
        textEn: "Message the school through in-app messaging",
        isCorrect: true,
      },
      {
        textFr: "Modifier l'évènement vous-même",
        textEn: "Edit the event yourself",
        isCorrect: false,
      },
      {
        textFr: "Ignorer, ça se réglera seul",
        textEn: "Ignore it, it will sort itself out",
        isCorrect: false,
      },
      {
        textFr: "Supprimer le compte de l'enfant",
        textEn: "Delete the child's account",
        isCorrect: false,
      },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: IMG("q7-punition-sanction"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Quelle affirmation décrit le mieux la différence entre une punition et une sanction ?",
    textEn:
      "Which statement best describes the difference between a punishment and a sanction?",
    hintFr:
      "Regardez qui décide de chaque mesure dans la fiche de l'évènement : l'enseignant ou la direction.",
    hintEn:
      "Look at who decides each measure on the event card: the teacher or the school management.",
    explanationFr:
      "Une punition est décidée par un enseignant pour un manquement mineur (bavardage, oubli de matériel...), tandis qu'une sanction relève de la direction pour un fait plus grave.",
    explanationEn:
      "A punishment is given by a teacher for a minor issue (talking in class, missing equipment...), while a sanction comes from school management for a more serious matter.",
    options: [
      {
        textFr:
          "La punition est décidée par un enseignant pour un manquement mineur, la sanction relève de la direction pour un fait plus grave",
        textEn:
          "A punishment is decided by a teacher for a minor issue, a sanction comes from management for a more serious matter",
        isCorrect: true,
      },
      {
        textFr: "Ce sont deux mots pour désigner exactement la même chose",
        textEn: "They are two words for exactly the same thing",
        isCorrect: false,
      },
      {
        textFr: "La sanction est toujours plus légère qu'une punition",
        textEn: "A sanction is always lighter than a punishment",
        isCorrect: false,
      },
      {
        textFr: "Seule la sanction est visible par les parents",
        textEn: "Only sanctions are visible to parents",
        isCorrect: false,
      },
    ],
  },
  {
    order: 8,
    type: "TRUE_FALSE",
    difficulty: "HARD",
    image: IMG("q8-kpi-filtre"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Les cartes chiffrées en haut du module (absences, retards, sanctions, punitions) permettent de filtrer la liste en un clic.",
    textEn:
      "The number cards at the top of the module (absences, latenesses, sanctions, punishments) let you filter the list with one click.",
    hintFr:
      "Essayez de cliquer sur une des cartes chiffrées en haut de la page.",
    hintEn: "Try clicking one of the number cards at the top of the page.",
    explanationFr:
      "Chaque carte KPI (absences, retards, sanctions, punitions) est cliquable et filtre instantanément le tableau sur cette catégorie.",
    explanationEn:
      "Each KPI card (absences, latenesses, sanctions, punishments) is clickable and instantly filters the table to that category.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 9,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: IMG("q9-detail-evenement"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Où pouvez-vous consulter le motif détaillé d'une punition et l'enseignant qui l'a saisie ?",
    textEn:
      "Where can you see the detailed reason for a punishment and which teacher recorded it?",
    hintFr:
      "Cliquez sur une ligne du tableau pour ouvrir le détail de l'évènement.",
    hintEn: "Click a row in the table to open the event's detail.",
    explanationFr:
      "En cliquant sur une ligne du tableau, la fiche détaillée de l'évènement s'ouvre avec le motif complet et l'auteur de la saisie.",
    explanationEn:
      "Clicking a table row opens the event's detail card with the full reason and who recorded it.",
    options: [
      {
        textFr:
          "En ouvrant la fiche détaillée de l'évènement depuis le tableau",
        textEn: "By opening the event's detail card from the table",
        isCorrect: true,
      },
      {
        textFr: "Ce n'est jamais indiqué",
        textEn: "It is never shown",
        isCorrect: false,
      },
      {
        textFr: "Uniquement en appelant l'école",
        textEn: "Only by calling the school",
        isCorrect: false,
      },
      {
        textFr: "Dans un email envoyé chaque mois",
        textEn: "In a monthly email",
        isCorrect: false,
      },
    ],
  },
  {
    order: 10,
    type: "MCQ_MULTI",
    difficulty: "HARD",
    image: IMG("q10-categories-suivies"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Parmi ces catégories, lesquelles sont suivies par le module Discipline ? (plusieurs réponses)",
    textEn:
      "Which of these categories does the Discipline module track? (select all that apply)",
    hintFr: "Regardez les quatre cartes chiffrées tout en haut de la page.",
    hintEn: "Look at the four number cards at the very top of the page.",
    explanationFr:
      "Le module suit quatre catégories : absences, retards, sanctions et punitions. Les notes de contrôle relèvent du module Notes, pas Discipline.",
    explanationEn:
      "The module tracks four categories: absences, latenesses, sanctions and punishments. Test grades belong to the Grades module, not Discipline.",
    options: [
      { textFr: "Les absences", textEn: "Absences", isCorrect: true },
      { textFr: "Les retards", textEn: "Latenesses", isCorrect: true },
      { textFr: "Les sanctions", textEn: "Sanctions", isCorrect: true },
      { textFr: "Les punitions", textEn: "Punishments", isCorrect: true },
      {
        textFr: "Les notes de contrôle",
        textEn: "Test grades",
        isCorrect: false,
      },
    ],
  },
  {
    order: 11,
    type: "TRUE_FALSE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Le parent peut modifier ou supprimer lui-même un évènement disciplinaire.",
    textEn: "A parent can edit or delete a disciplinary event themselves.",
    hintFr: "Le parent consulte, il ne saisit pas les évènements.",
    hintEn: "Parents view events, they don't record them.",
    explanationFr:
      "Seul l'établissement saisit et gère les évènements disciplinaires : le parent les consulte uniquement.",
    explanationEn:
      "Only the school records and manages disciplinary events: parents can only view them.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 12,
    type: "MCQ_SINGLE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Si vous avez plusieurs enfants scolarisés, comment consultez-vous la discipline de chacun ?",
    textEn:
      "If you have several children at school, how do you check each one's discipline record?",
    hintFr: "La fiche affichée dépend de l'enfant actuellement sélectionné.",
    hintEn: "The profile shown depends on which child is currently selected.",
    explanationFr:
      "En changeant d'enfant sélectionné, la fiche et le module Discipline affichés se mettent à jour pour cet enfant.",
    explanationEn:
      "By switching the selected child, the profile and Discipline module shown update for that child.",
    options: [
      {
        textFr: "En changeant d'enfant sélectionné sur la fiche",
        textEn: "By switching the selected child on the profile",
        isCorrect: true,
      },
      {
        textFr: "Il faut un compte séparé par enfant",
        textEn: "You need a separate account per child",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas possible, un seul enfant à la fois par compte",
        textEn: "It isn't possible, only one child per account",
        isCorrect: false,
      },
      {
        textFr: "En contactant l'école pour chaque enfant",
        textEn: "By contacting the school for each child",
        isCorrect: false,
      },
    ],
  },
  {
    order: 13,
    type: "TRUE_FALSE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Le module Discipline affiche aussi les mentions positives, pas seulement les sanctions.",
    textEn:
      "The Discipline module also shows positive mentions, not only sanctions.",
    hintFr: "Le module ne sert pas qu'à signaler des manquements.",
    hintEn: "The module isn't only there to flag misbehaviour.",
    explanationFr:
      "Le module valorise aussi les comportements exemplaires grâce aux mentions positives, au même titre que les sanctions.",
    explanationEn:
      "The module also highlights exemplary behaviour through positive mentions, alongside sanctions.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 14,
    type: "MCQ_SINGLE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr: "Quel est le rôle principal du module Discipline pour un parent ?",
    textEn: "What is the main purpose of the Discipline module for a parent?",
    hintFr: 'Pensez au mot "suivi".',
    hintEn: 'Think of the word "follow-up".',
    explanationFr:
      "Il permet de suivre le comportement scolaire de son enfant en un coup d'œil : sanctions, punitions et mentions positives.",
    explanationEn:
      "It lets you follow your child's behaviour at a glance: sanctions, punishments and positive mentions.",
    options: [
      {
        textFr:
          "Suivre le comportement scolaire de son enfant en un coup d'œil",
        textEn: "Follow your child's school behaviour at a glance",
        isCorrect: true,
      },
      {
        textFr: "Gérer l'emploi du temps de l'enfant",
        textEn: "Manage the child's timetable",
        isCorrect: false,
      },
      {
        textFr: "Payer les frais de cantine",
        textEn: "Pay school lunch fees",
        isCorrect: false,
      },
      {
        textFr: "Envoyer les devoirs à l'enseignant",
        textEn: "Send homework to the teacher",
        isCorrect: false,
      },
    ],
  },
  {
    order: 15,
    type: "TRUE_FALSE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Vous pouvez consulter les évènements disciplinaires d'un enfant qui n'est pas le vôtre.",
    textEn: "You can view the disciplinary events of a child who isn't yours.",
    hintFr: "L'accès dépend du lien de rattachement à l'enfant.",
    hintEn: "Access depends on your link to the child.",
    explanationFr:
      "Seuls les parents rattachés à l'enfant peuvent consulter ses évènements disciplinaires.",
    explanationEn:
      "Only parents linked to a child can view that child's disciplinary events.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 16,
    type: "MCQ_SINGLE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      'À quoi sert la pastille rouge à côté de "Discipline" dans le menu ?',
    textEn: 'What is the red badge next to "Discipline" in the menu for?',
    hintFr: "C'est un signal, pas un compteur permanent.",
    hintEn: "It's a signal, not a permanent counter.",
    explanationFr:
      "Elle signale un nouvel évènement disciplinaire pas encore consulté, et disparaît une fois consultée.",
    explanationEn:
      "It flags a new disciplinary event you haven't viewed yet, and disappears once you've seen it.",
    options: [
      {
        textFr: "Signaler un nouvel évènement non consulté",
        textEn: "Flag a new, unread event",
        isCorrect: true,
      },
      {
        textFr: "Indiquer le nombre total de sanctions de l'année",
        textEn: "Show the total number of sanctions for the year",
        isCorrect: false,
      },
      {
        textFr: "Indiquer que le compte est bloqué",
        textEn: "Show that the account is blocked",
        isCorrect: false,
      },
      {
        textFr: "Elle n'a aucune signification",
        textEn: "It has no meaning",
        isCorrect: false,
      },
    ],
  },
  {
    order: 17,
    type: "TRUE_FALSE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Il faut une connexion internet pour consulter le module Discipline.",
    textEn: "You need an internet connection to view the Discipline module.",
    hintFr: "L'application charge les données depuis les serveurs de l'école.",
    hintEn: "The app loads data from the school's servers.",
    explanationFr:
      "Comme le reste de l'application, le module Discipline nécessite une connexion pour charger les données à jour.",
    explanationEn:
      "Like the rest of the app, the Discipline module needs a connection to load up-to-date data.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 18,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Que se passe-t-il si votre enfant reçoit plusieurs avertissements dans le mois ?",
    textEn: "What happens if your child gets several warnings within a month?",
    hintFr:
      "Le module se contente d'enregistrer et d'afficher, il ne déclenche rien automatiquement.",
    hintEn:
      "The module only records and displays, it doesn't trigger anything automatically.",
    explanationFr:
      "Chaque avertissement reste visible dans l'historique ; c'est au parent d'échanger avec l'école si un comportement se répète.",
    explanationEn:
      "Each warning stays visible in the history; it's up to the parent to contact the school if a pattern emerges.",
    options: [
      {
        textFr:
          "Cela reste visible dans son historique, à vous d'échanger avec l'école si besoin",
        textEn:
          "It stays visible in their history, it's on you to reach out to the school if needed",
        isCorrect: true,
      },
      {
        textFr: "Il est automatiquement exclu de l'école",
        textEn: "They are automatically expelled",
        isCorrect: false,
      },
      {
        textFr: "Rien n'est enregistré au-delà du premier avertissement",
        textEn: "Nothing is recorded beyond the first warning",
        isCorrect: false,
      },
      {
        textFr: "Une sanction est appliquée automatiquement par l'application",
        textEn: "A sanction is automatically applied by the app",
        isCorrect: false,
      },
    ],
  },
  {
    order: 19,
    type: "TRUE_FALSE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Les mentions positives comptent dans une moyenne de comportement chiffrée.",
    textEn: "Positive mentions count toward a numeric behaviour average.",
    hintFr: "Le module Discipline n'affiche pas de note chiffrée.",
    hintEn: "The Discipline module doesn't display a numeric score.",
    explanationFr:
      "Il n'y a pas de moyenne de comportement chiffrée : les mentions positives sont un simple enregistrement qualitatif.",
    explanationEn:
      "There is no numeric behaviour average: positive mentions are just a qualitative record.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 20,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr: "Qui peut attribuer une mention positive à un élève ?",
    textEn: "Who can give a student a positive mention?",
    hintFr: "Ce sont les mêmes personnes qui saisissent les sanctions.",
    hintEn: "It's the same people who record sanctions.",
    explanationFr:
      "Un enseignant ou un membre de l'équipe éducative peut saisir une mention positive, comme pour tout autre évènement.",
    explanationEn:
      "A teacher or a staff member can record a positive mention, just like any other event.",
    options: [
      {
        textFr: "Un enseignant ou un membre de l'équipe éducative",
        textEn: "A teacher or a staff member",
        isCorrect: true,
      },
      { textFr: "Les parents", textEn: "Parents", isCorrect: false },
      {
        textFr: "L'administration financière",
        textEn: "The finance office",
        isCorrect: false,
      },
      {
        textFr: "Un algorithme automatique",
        textEn: "An automatic algorithm",
        isCorrect: false,
      },
    ],
  },
  {
    order: 21,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Un évènement disciplinaire peut-il être modifié après sa création ?",
    textEn: "Can a disciplinary event be edited after it's created?",
    hintFr: "Le parent ne peut pas le faire lui-même.",
    hintEn: "The parent cannot do it themselves.",
    explanationFr:
      "Oui, l'école peut corriger un évènement en cas d'erreur constatée ; le parent, lui, ne peut pas le modifier.",
    explanationEn:
      "Yes, the school can correct an event if a mistake is found; the parent cannot edit it themselves.",
    options: [
      {
        textFr: "Oui, par l'école si une erreur est constatée",
        textEn: "Yes, by the school if a mistake is found",
        isCorrect: true,
      },
      { textFr: "Jamais", textEn: "Never", isCorrect: false },
      {
        textFr: "Oui, par le parent",
        textEn: "Yes, by the parent",
        isCorrect: false,
      },
      {
        textFr: "Oui, automatiquement après 30 jours",
        textEn: "Yes, automatically after 30 days",
        isCorrect: false,
      },
    ],
  },
  {
    order: 22,
    type: "TRUE_FALSE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Le module Discipline distingue clairement les sanctions des punitions dans le tableau.",
    textEn:
      "The Discipline module clearly distinguishes sanctions from punishments in the table.",
    hintFr: "Chaque ligne du tableau précise le type d'évènement.",
    hintEn: "Each row in the table states the event type.",
    explanationFr:
      "Chaque ligne du tableau précise le type d'évènement (sanction, punition, avertissement, mention), sans les confondre.",
    explanationEn:
      "Each row states the event type (sanction, punishment, warning, mention) without mixing them up.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 23,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr: "Comment l'école motive-t-elle un avertissement ?",
    textEn: "How does the school justify a warning?",
    hintFr: "L'information est écrite sur la fiche de l'évènement.",
    hintEn: "The information is written on the event's card.",
    explanationFr:
      "En renseignant un motif consultable directement sur la fiche de l'évènement.",
    explanationEn:
      "By filling in a reason you can read directly on the event's card.",
    options: [
      {
        textFr:
          "En renseignant un motif consultable sur la fiche de l'évènement",
        textEn: "By filling in a reason readable on the event's card",
        isCorrect: true,
      },
      {
        textFr: "Aucun motif n'est requis",
        textEn: "No reason is required",
        isCorrect: false,
      },
      {
        textFr: "Uniquement par un appel téléphonique",
        textEn: "Only through a phone call",
        isCorrect: false,
      },
      {
        textFr: "Le motif n'est jamais visible du parent",
        textEn: "The reason is never visible to the parent",
        isCorrect: false,
      },
    ],
  },
  {
    order: 24,
    type: "TRUE_FALSE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Une sanction disciplinaire peut avoir un impact sur le dossier scolaire de l'enfant.",
    textEn:
      "A disciplinary sanction can have an impact on the child's school record.",
    hintFr: "Une sanction est plus grave qu'une simple punition.",
    hintEn: "A sanction is more serious than a simple punishment.",
    explanationFr:
      "Une sanction, décidée par la direction pour un fait grave, fait partie du dossier scolaire de l'élève.",
    explanationEn:
      "A sanction, decided by school management for a serious matter, becomes part of the student's school record.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 25,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Si vous contestez un évènement disciplinaire, quelle est la bonne démarche ?",
    textEn:
      "If you want to dispute a disciplinary event, what's the right approach?",
    hintFr: "La fiche de l'évènement n'est pas modifiable par le parent.",
    hintEn: "The event card isn't editable by the parent.",
    explanationFr:
      "Écrire à l'école via la messagerie pour en discuter : la fiche elle-même n'est pas modifiable par le parent.",
    explanationEn:
      "Message the school through in-app messaging to discuss it: the card itself isn't editable by the parent.",
    options: [
      {
        textFr:
          "Écrire à l'école via la messagerie, la fiche n'est pas modifiable par vous",
        textEn:
          "Message the school through messaging, the card isn't editable by you",
        isCorrect: true,
      },
      {
        textFr: "Supprimer l'évènement vous-même",
        textEn: "Delete the event yourself",
        isCorrect: false,
      },
      {
        textFr: "Ignorer, cela n'a pas d'importance",
        textEn: "Ignore it, it doesn't matter",
        isCorrect: false,
      },
      {
        textFr: "Appeler la mairie",
        textEn: "Call the city hall",
        isCorrect: false,
      },
    ],
  },
  {
    order: 26,
    type: "MCQ_MULTI",
    difficulty: "HARD",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Quels éléments différencient une punition d'une sanction ? (plusieurs réponses)",
    textEn:
      "Which elements distinguish a punishment from a sanction? (select all that apply)",
    hintFr: "Repensez à qui décide et à la gravité du fait.",
    hintEn: "Think about who decides and how serious the matter is.",
    explanationFr:
      "Ce qui les distingue : qui la décide (enseignant vs direction) et la gravité du fait reproché — jamais un détail visuel de l'application.",
    explanationEn:
      "What sets them apart: who decides (teacher vs management) and how serious the matter is — never a visual detail of the app.",
    options: [
      {
        textFr: "Qui la décide (enseignant ou direction)",
        textEn: "Who decides it (teacher or management)",
        isCorrect: true,
      },
      {
        textFr: "La gravité du fait reproché",
        textEn: "How serious the matter is",
        isCorrect: true,
      },
      {
        textFr: "La couleur affichée dans l'application",
        textEn: "The colour shown in the app",
        isCorrect: false,
      },
      {
        textFr: "Le jour de la semaine où elle a lieu",
        textEn: "The day of the week it happens on",
        isCorrect: false,
      },
    ],
  },
  {
    order: 27,
    type: "TRUE_FALSE",
    difficulty: "HARD",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Une mention positive apparaît dans le même tableau chronologique que les sanctions et punitions.",
    textEn:
      "A positive mention appears in the same chronological table as sanctions and punishments.",
    hintFr:
      "Le tableau du module Discipline liste tous les types d'évènements ensemble.",
    hintEn: "The Discipline module's table lists every event type together.",
    explanationFr:
      "Tous les types d'évènements — y compris les mentions positives — apparaissent ensemble, triés par date.",
    explanationEn:
      "Every event type — including positive mentions — appears together, sorted by date.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 28,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Pourquoi est-il utile de croiser le module Discipline avec la messagerie ?",
    textEn: "Why is it useful to combine the Discipline module with messaging?",
    hintFr: "Les deux modules sont accessibles depuis la même application.",
    hintEn: "Both modules live in the same app.",
    explanationFr:
      "Pour échanger directement avec l'école sur un évènement précis, sans quitter votre suivi disciplinaire de l'enfant.",
    explanationEn:
      "To message the school directly about a specific event, without leaving your view of your child's discipline record.",
    options: [
      {
        textFr:
          "Pour échanger directement avec l'école sur un évènement précis",
        textEn: "To message the school directly about a specific event",
        isCorrect: true,
      },
      {
        textFr: "Cela n'a aucune utilité",
        textEn: "It's not useful at all",
        isCorrect: false,
      },
      {
        textFr: "Pour supprimer un évènement plus vite",
        textEn: "To delete an event faster",
        isCorrect: false,
      },
      {
        textFr: "Pour changer le rôle actif du compte",
        textEn: "To change the account's active role",
        isCorrect: false,
      },
    ],
  },
  {
    order: 29,
    type: "TRUE_FALSE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Un avertissement fait partie des types d'évènements suivis par le module Discipline.",
    textEn:
      "A warning is one of the event types tracked by the Discipline module.",
    hintFr: "Pensez aux différents types affichés dans le tableau.",
    hintEn: "Think of the different types shown in the table.",
    explanationFr:
      "Sanctions, punitions, avertissements et mentions positives sont tous suivis par le module Discipline.",
    explanationEn:
      "Sanctions, punishments, warnings and positive mentions are all tracked by the Discipline module.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 30,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Quel est l'intérêt de consulter régulièrement le module Discipline ?",
    textEn: "What's the benefit of checking the Discipline module regularly?",
    hintFr: "Mieux vaut agir tôt qu'être surpris en fin d'année.",
    hintEn: "It's better to act early than be surprised at year's end.",
    explanationFr:
      "Cela permet de réagir tôt en cas de comportement récurrent, plutôt que de découvrir un historique chargé trop tard.",
    explanationEn:
      "It lets you react early to a recurring pattern, rather than discovering a heavy history too late.",
    options: [
      {
        textFr: "Réagir tôt en cas de comportement récurrent",
        textEn: "React early to a recurring pattern",
        isCorrect: true,
      },
      {
        textFr: "Cela n'apporte rien de plus",
        textEn: "It brings nothing extra",
        isCorrect: false,
      },
      {
        textFr: "Cela sert uniquement à noter les paiements",
        textEn: "It's only used to track payments",
        isCorrect: false,
      },
      {
        textFr: "Cela remplace le bulletin scolaire",
        textEn: "It replaces the school report card",
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
        difficulty: question.difficulty,
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
        difficulty: question.difficulty,
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
