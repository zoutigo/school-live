import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const IMG = (name) => `/training-quiz/messagerie/${name}.svg`;

const CHAPTER = {
  role: "PARENT",
  moduleKey: "messagerie",
  order: 2,
  icon: "MessageSquare",
  colorFrom: "#8B6DD9",
  colorTo: "#5B3FBF",
  titleFr: "Messagerie",
  titleEn: "Messaging",
  descriptionFr:
    "Apprenez à échanger avec l'école : écrire, répondre, retrouver vos messages et organiser vos dossiers.",
  descriptionEn:
    "Learn how to communicate with the school: write, reply, find your messages and organise your folders.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: IMG("q1-nouveau-message"),
    deepLinkRoute: "/messagerie",
    textFr: "Où écrire un nouveau message à l'école ?",
    textEn: "Where do you write a new message to the school?",
    hintFr: "Cherchez un bouton bien visible en haut de la messagerie.",
    hintEn:
      "Look for a clearly visible button at the top of the messaging page.",
    explanationFr:
      'Le bouton "Nouveau message" en haut de la messagerie ouvre le formulaire de composition.',
    explanationEn:
      'The "New message" button at the top of the messaging page opens the compose form.',
    options: [
      {
        textFr: 'En cliquant sur le bouton "Nouveau message"',
        textEn: 'By clicking the "New message" button',
        isCorrect: true,
      },
      {
        textFr: "En appelant l'école",
        textEn: "By calling the school",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas possible depuis l'application",
        textEn: "This isn't possible from the app",
        isCorrect: false,
      },
      {
        textFr: "En passant par les paramètres du compte",
        textEn: "Through account settings",
        isCorrect: false,
      },
    ],
  },
  {
    order: 2,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: IMG("q2-envoyes"),
    deepLinkRoute: "/messagerie",
    textFr:
      'Un message que vous envoyez apparaît automatiquement dans le dossier "Envoyés".',
    textEn: 'A message you send automatically appears in the "Sent" folder.',
    hintFr: "Regardez les dossiers listés sur le côté de la messagerie.",
    hintEn: "Look at the folders listed on the side of the messaging page.",
    explanationFr:
      'Comme dans une boîte email classique, chaque message envoyé est archivé dans le dossier "Envoyés".',
    explanationEn:
      'Like a classic email inbox, every sent message is filed in the "Sent" folder.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 3,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: IMG("q3-boite-reception"),
    deepLinkRoute: "/messagerie",
    textFr: "Quel dossier affiche les messages que vous avez reçus ?",
    textEn: "Which folder shows the messages you have received?",
    hintFr: "C'est le tout premier dossier de la liste.",
    hintEn: "It's the very first folder in the list.",
    explanationFr:
      'La "Boîte de réception" liste tous les messages reçus des enseignants et de l\'administration.',
    explanationEn:
      'The "Inbox" lists every message received from teachers and school staff.',
    options: [
      {
        textFr: "La boîte de réception",
        textEn: "The inbox",
        isCorrect: true,
      },
      { textFr: "Les brouillons", textEn: "Drafts", isCorrect: false },
      { textFr: "Les archives", textEn: "Archive", isCorrect: false },
      { textFr: "Les envoyés", textEn: "Sent", isCorrect: false },
    ],
  },
  {
    order: 4,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: IMG("q4-brouillons"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Allez dans la messagerie, commencez à écrire un nouveau message sans l'envoyer, puis revenez ici : où le retrouve-t-on ?",
    textEn:
      "Open messaging, start writing a new message without sending it, then come back: where do you find it?",
    hintFr: "Ce dossier garde vos messages inachevés.",
    hintEn: "This folder keeps your unfinished messages.",
    explanationFr:
      "Un message non envoyé reste disponible dans le dossier \"Brouillons\" jusqu'à ce que vous l'envoyiez ou le supprimiez.",
    explanationEn:
      'An unsent message stays available in the "Drafts" folder until you send or delete it.',
    options: [
      { textFr: "Dans les brouillons", textEn: "In drafts", isCorrect: true },
      {
        textFr: "Il est automatiquement supprimé",
        textEn: "It is automatically deleted",
        isCorrect: false,
      },
      {
        textFr: "Dans la boîte de réception",
        textEn: "In the inbox",
        isCorrect: false,
      },
      {
        textFr: "Dans les archives",
        textEn: "In the archive",
        isCorrect: false,
      },
    ],
  },
  {
    order: 5,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: IMG("q5-archives"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Ouvrez un message de votre boîte de réception et cherchez une action pour le ranger sans le supprimer : quel dossier permet cela ?",
    textEn:
      "Open a message in your inbox and look for an action to put it aside without deleting it: which folder does that?",
    hintFr:
      "Pensez à un dossier qui garde une trace sans encombrer la boîte de réception.",
    hintEn:
      "Think of a folder that keeps a record without cluttering the inbox.",
    explanationFr:
      'Les "Archives" permettent de sortir un message de la boîte de réception tout en le conservant.',
    explanationEn:
      'The "Archive" folder lets you move a message out of the inbox while keeping it.',
    options: [
      { textFr: "Les archives", textEn: "The archive", isCorrect: true },
      { textFr: "Les brouillons", textEn: "Drafts", isCorrect: false },
      { textFr: "Les envoyés", textEn: "Sent", isCorrect: false },
      {
        textFr: "Il faut le supprimer, il n'y a pas d'autre solution",
        textEn: "You must delete it, there is no other option",
        isCorrect: false,
      },
    ],
  },
  {
    order: 6,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: IMG("q6-repondre"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Ouvrez un message reçu et regardez les actions proposées : pouvez-vous y répondre directement, sans recréer un nouveau message de zéro ?",
    textEn:
      "Open a received message and look at the actions offered: can you reply to it directly, without creating a new one from scratch?",
    hintFr: "Ouvrez un message reçu et regardez les actions proposées.",
    hintEn: "Open a received message and look at the actions offered.",
    explanationFr:
      'Le bouton "Répondre" pré-remplit un nouveau message avec le bon destinataire et l\'objet.',
    explanationEn:
      'The "Reply" button pre-fills a new message with the right recipient and subject.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 7,
    type: "MCQ_MULTI",
    stage: "MASTERY",
    image: IMG("q7-dossiers"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Parmi ces dossiers, lesquels retrouve-t-on dans la messagerie ? (plusieurs réponses)",
    textEn:
      "Which of these folders can you find in the messaging module? (select all that apply)",
    hintFr: "Regardez la liste des dossiers sur le côté de l'écran.",
    hintEn: "Look at the list of folders on the side of the screen.",
    explanationFr:
      "La messagerie propose quatre dossiers : boîte de réception, envoyés, brouillons et archives. Il n'y a pas de corbeille distincte.",
    explanationEn:
      "Messaging has four folders: inbox, sent, drafts and archive. There is no separate trash folder.",
    options: [
      {
        textFr: "Boîte de réception",
        textEn: "Inbox",
        isCorrect: true,
      },
      { textFr: "Envoyés", textEn: "Sent", isCorrect: true },
      { textFr: "Brouillons", textEn: "Drafts", isCorrect: true },
      { textFr: "Archives", textEn: "Archive", isCorrect: true },
      { textFr: "Corbeille", textEn: "Trash", isCorrect: false },
    ],
  },
  {
    order: 8,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: IMG("q8-recherche"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Comment retrouver rapidement un message précis dans une longue boîte de réception ?",
    textEn: "How do you quickly find a specific message in a long inbox?",
    hintFr: "Une barre en haut de la liste des messages sert exactement à ça.",
    hintEn: "A bar at the top of the message list does exactly that.",
    explanationFr:
      "La barre de recherche en haut de la messagerie filtre instantanément les messages par mot-clé.",
    explanationEn:
      "The search bar at the top of the messaging page instantly filters messages by keyword.",
    options: [
      {
        textFr: "En utilisant la barre de recherche",
        textEn: "By using the search bar",
        isCorrect: true,
      },
      {
        textFr: "En faisant défiler tous les messages un par un",
        textEn: "By scrolling through every message one by one",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas possible",
        textEn: "It isn't possible",
        isCorrect: false,
      },
      {
        textFr: "En contactant le support technique",
        textEn: "By contacting technical support",
        isCorrect: false,
      },
    ],
  },
  {
    order: 9,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: IMG("q9-envoyer-brouillon"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Vous terminez et envoyez un brouillon commencé la veille : où se trouve-t-il ensuite ?",
    textEn:
      "You finish and send a draft started the day before: where does it end up?",
    hintFr: "Une fois envoyé, un message n'est plus un brouillon.",
    hintEn: "Once sent, a message is no longer a draft.",
    explanationFr:
      'Dès qu\'un brouillon est envoyé, il quitte le dossier "Brouillons" et apparaît dans "Envoyés".',
    explanationEn:
      'As soon as a draft is sent, it leaves the "Drafts" folder and appears in "Sent".',
    options: [
      {
        textFr: 'Dans le dossier "Envoyés"',
        textEn: 'In the "Sent" folder',
        isCorrect: true,
      },
      {
        textFr: "Il reste dans les brouillons",
        textEn: "It stays in drafts",
        isCorrect: false,
      },
      {
        textFr: "Dans les archives",
        textEn: "In the archive",
        isCorrect: false,
      },
      {
        textFr: "Il disparaît de l'application",
        textEn: "It disappears from the app",
        isCorrect: false,
      },
    ],
  },
  {
    order: 10,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: IMG("q10-destinataire"),
    deepLinkRoute: "/messagerie",
    textFr:
      'Quand vous cliquez sur "Répondre" à un message reçu, que se passe-t-il ?',
    textEn: 'When you click "Reply" on a received message, what happens?',
    hintFr: "Le formulaire de composition s'ouvre déjà à moitié rempli.",
    hintEn: "The compose form opens already half filled in.",
    explanationFr:
      "Un nouveau message s'ouvre avec le destinataire et l'objet déjà pré-remplis, prêt à recevoir votre réponse.",
    explanationEn:
      "A new message opens with the recipient and subject already pre-filled, ready for your reply.",
    options: [
      {
        textFr:
          "Un nouveau message s'ouvre avec le destinataire et l'objet pré-remplis",
        textEn: "A new message opens with the recipient and subject pre-filled",
        isCorrect: true,
      },
      {
        textFr: "Le message original est immédiatement supprimé",
        textEn: "The original message is immediately deleted",
        isCorrect: false,
      },
      {
        textFr: "Vous devez retaper l'adresse de l'école",
        textEn: "You have to retype the school's address",
        isCorrect: false,
      },
      {
        textFr: "Rien ne se passe, il faut utiliser un email externe",
        textEn: "Nothing happens, you must use an external email",
        isCorrect: false,
      },
    ],
  },
  {
    order: 11,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Vous pouvez joindre un fichier (photo, document) à un message envoyé à l'école.",
    textEn:
      "You can attach a file (photo, document) to a message sent to the school.",
    hintFr: "Cherchez une icône de trombone dans le formulaire de composition.",
    hintEn: "Look for a paperclip icon in the compose form.",
    explanationFr:
      "Le formulaire de composition permet de joindre un fichier à votre message, comme dans une messagerie classique.",
    explanationEn:
      "The compose form lets you attach a file to your message, like in a classic mail app.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 12,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr: "Comment savez-vous qu'un nouveau message est arrivé ?",
    textEn: "How do you know a new message has arrived?",
    hintFr: "Comme pour les autres modules, un signal visuel vous prévient.",
    hintEn: "Like other modules, a visual signal warns you.",
    explanationFr:
      "Une pastille de notification apparaît sur l'entrée Messagerie du menu tant que le message n'est pas lu.",
    explanationEn:
      "A notification badge appears on the Messaging menu entry until the message is read.",
    options: [
      {
        textFr: "Une pastille de notification apparaît sur l'entrée Messagerie",
        textEn: "A notification badge appears on the Messaging entry",
        isCorrect: true,
      },
      {
        textFr: "Un email externe vous est envoyé",
        textEn: "An external email is sent to you",
        isCorrect: false,
      },
      {
        textFr: "Rien ne le signale",
        textEn: "Nothing signals it",
        isCorrect: false,
      },
      {
        textFr: "L'application ferme automatiquement les autres écrans",
        textEn: "The app automatically closes other screens",
        isCorrect: false,
      },
    ],
  },
  {
    order: 13,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr: "Il faut ressaisir l'adresse de l'école à chaque nouveau message.",
    textEn: "You have to retype the school's address for every new message.",
    hintFr: "L'application connaît déjà votre établissement.",
    hintEn: "The app already knows your school.",
    explanationFr:
      "Le destinataire école est préselectionné : pas besoin de ressaisir une adresse à chaque message.",
    explanationEn:
      "The school recipient is preselected: no need to retype an address every time.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 14,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr: "Qui peut recevoir vos messages envoyés depuis l'application ?",
    textEn: "Who can receive your messages sent from the app?",
    hintFr: "La messagerie relie les familles à un seul type de destinataire.",
    hintEn: "Messaging connects families to one kind of recipient.",
    explanationFr:
      "L'école — enseignants et administration — est le destinataire des messages envoyés depuis l'application.",
    explanationEn:
      "The school — teachers and school staff — is the recipient of messages sent from the app.",
    options: [
      {
        textFr: "L'école (enseignants, administration)",
        textEn: "The school (teachers, staff)",
        isCorrect: true,
      },
      {
        textFr: "N'importe quel email externe",
        textEn: "Any external email address",
        isCorrect: false,
      },
      {
        textFr: "Uniquement le directeur",
        textEn: "Only the principal",
        isCorrect: false,
      },
      {
        textFr: "Personne, c'est un brouillon uniquement",
        textEn: "No one, it's only a draft",
        isCorrect: false,
      },
    ],
  },
  {
    order: 15,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr: "Combien de dossiers principaux propose la messagerie ?",
    textEn: "How many main folders does messaging offer?",
    hintFr: "Comptez-les sur le côté de l'écran.",
    hintEn: "Count them on the side of the screen.",
    explanationFr:
      "Quatre dossiers : boîte de réception, envoyés, brouillons et archives.",
    explanationEn: "Four folders: inbox, sent, drafts and archive.",
    options: [
      {
        textFr: "Quatre : réception, envoyés, brouillons, archives",
        textEn: "Four: inbox, sent, drafts, archive",
        isCorrect: true,
      },
      { textFr: "Deux", textEn: "Two", isCorrect: false },
      { textFr: "Six", textEn: "Six", isCorrect: false },
      { textFr: "Un seul", textEn: "Just one", isCorrect: false },
    ],
  },
  {
    order: 16,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "La messagerie de l'application est accessible aussi bien sur mobile que sur le web.",
    textEn: "The app's messaging is available on both mobile and web.",
    hintFr: "L'application est disponible sur les deux supports.",
    hintEn: "The app is available on both platforms.",
    explanationFr:
      "La messagerie est disponible sur mobile et sur web, avec les mêmes fonctionnalités.",
    explanationEn:
      "Messaging is available on mobile and web, with the same features.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 17,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Que se passe-t-il si vous quittez la page sans envoyer votre message en cours de rédaction ?",
    textEn:
      "What happens if you leave the page without sending your message in progress?",
    hintFr: "Rien n'est perdu : un dossier garde une copie.",
    hintEn: "Nothing is lost: a folder keeps a copy.",
    explanationFr:
      "Il est conservé dans le dossier \"Brouillons\" jusqu'à ce que vous l'envoyiez ou le supprimiez.",
    explanationEn:
      'It\'s kept in the "Drafts" folder until you send or delete it.',
    options: [
      {
        textFr: "Il est conservé dans les brouillons",
        textEn: "It's kept in drafts",
        isCorrect: true,
      },
      {
        textFr: "Il est perdu définitivement",
        textEn: "It's lost for good",
        isCorrect: false,
      },
      {
        textFr: "Il est envoyé automatiquement",
        textEn: "It's sent automatically",
        isCorrect: false,
      },
      {
        textFr: "Une erreur bloque l'application",
        textEn: "An error blocks the app",
        isCorrect: false,
      },
    ],
  },
  {
    order: 18,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Ouvrez un message archivé et regardez les actions proposées : pouvez-vous y répondre ?",
    textEn:
      "Open an archived message and look at the actions offered: can you reply to it?",
    hintFr: "Archiver ne bloque pas les actions possibles sur le message.",
    hintEn: "Archiving doesn't block the actions available on a message.",
    explanationFr:
      "Oui, l'archivage ne bloque pas la réponse : ce n'est qu'un rangement du message.",
    explanationEn:
      "Yes, archiving doesn't block replying: it's only a way of putting the message aside.",
    options: [
      {
        textFr: "Oui, l'archivage ne bloque pas la réponse",
        textEn: "Yes, archiving doesn't block replying",
        isCorrect: true,
      },
      {
        textFr: "Non, il faut d'abord le restaurer",
        textEn: "No, you must restore it first",
        isCorrect: false,
      },
      { textFr: "Non, jamais", textEn: "No, never", isCorrect: false },
      {
        textFr: "Oui mais seulement le lendemain",
        textEn: "Yes but only the next day",
        isCorrect: false,
      },
    ],
  },
  {
    order: 19,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Archivez un message de votre boîte de réception, puis vérifiez : est-il aussi retiré de la boîte de réception ?",
    textEn:
      "Archive a message from your inbox, then check: is it also removed from the inbox?",
    hintFr: "Archiver déplace le message, il ne le duplique pas.",
    hintEn: "Archiving moves the message, it doesn't duplicate it.",
    explanationFr:
      "Archiver un message le sort de la boîte de réception tout en le conservant dans les Archives.",
    explanationEn:
      "Archiving moves a message out of the inbox while keeping it in the Archive.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 20,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Ouvrez le dossier Archives de la messagerie : un message archivé peut-il y être retrouvé plus tard ?",
    textEn:
      "Open the messaging Archive folder: can an archived message be found there later?",
    hintFr: "L'archivage n'est pas une suppression.",
    hintEn: "Archiving isn't deleting.",
    explanationFr: "Oui, dans le dossier Archives, à tout moment.",
    explanationEn: "Yes, in the Archive folder, at any time.",
    options: [
      {
        textFr: "Oui, dans le dossier Archives",
        textEn: "Yes, in the Archive folder",
        isCorrect: true,
      },
      {
        textFr: "Non, il est perdu",
        textEn: "No, it's lost",
        isCorrect: false,
      },
      {
        textFr: "Oui, uniquement par l'école",
        textEn: "Yes, only by the school",
        isCorrect: false,
      },
      {
        textFr: "Non, sauf en contactant le support",
        textEn: "No, unless you contact support",
        isCorrect: false,
      },
    ],
  },
  {
    order: 21,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Laissez un brouillon inachevé dans la messagerie et revenez plus tard : reste-t-il enregistré sans être envoyé ?",
    textEn:
      "Leave an unfinished draft in messaging and come back later: does it stay saved without being sent?",
    hintFr: "Rien n'oblige à envoyer un brouillon immédiatement.",
    hintEn: "Nothing forces you to send a draft right away.",
    explanationFr:
      "Un brouillon reste disponible aussi longtemps que nécessaire, jusqu'à ce que vous l'envoyiez ou le supprimiez.",
    explanationEn:
      "A draft stays available for as long as needed, until you send or delete it.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 22,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      'Ouvrez le dossier "Envoyés" de la messagerie : que devient un message une fois qu\'il y figure ?',
    textEn:
      'Open the "Sent" folder in messaging: what happens to a message once it\'s in there?',
    hintFr: "Ce dossier garde une trace, il ne l'efface pas.",
    hintEn: "This folder keeps a record, it doesn't erase it.",
    explanationFr:
      "Il reste consultable à tout moment : vous pouvez le relire quand vous le souhaitez.",
    explanationEn:
      "It stays available at any time: you can reread it whenever you like.",
    options: [
      {
        textFr: "Il reste consultable, vous pouvez le relire à tout moment",
        textEn: "It stays available, you can reread it any time",
        isCorrect: true,
      },
      {
        textFr: "Il est automatiquement supprimé après 24h",
        textEn: "It's automatically deleted after 24h",
        isCorrect: false,
      },
      {
        textFr: "Il n'est plus consultable",
        textEn: "It's no longer available",
        isCorrect: false,
      },
      {
        textFr: "Il repasse en brouillon",
        textEn: "It goes back to drafts",
        isCorrect: false,
      },
    ],
  },
  {
    order: 23,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      'Ouvrez un message reçu et cliquez sur "Répondre" : pourquoi utiliser ce bouton plutôt que "Nouveau message" pour continuer un échange ?',
    textEn:
      'Open a received message and click "Reply": why use this button rather than "New message" to continue an exchange?',
    hintFr: "Cela évite de tout ressaisir.",
    hintEn: "It avoids retyping everything.",
    explanationFr:
      "Cela garde le fil de la conversation, avec le bon destinataire et le bon objet déjà remplis.",
    explanationEn:
      "It keeps the conversation thread, with the right recipient and subject already filled in.",
    options: [
      {
        textFr:
          "Cela garde le fil de la conversation avec le bon destinataire et objet",
        textEn: "It keeps the thread with the right recipient and subject",
        isCorrect: true,
      },
      {
        textFr: "Il n'y a aucune différence",
        textEn: "There is no difference",
        isCorrect: false,
      },
      {
        textFr: '"Répondre" est réservé à l\'école',
        textEn: '"Reply" is reserved for the school',
        isCorrect: false,
      },
      {
        textFr: '"Nouveau message" ne fonctionne plus une fois un message reçu',
        textEn: '"New message" stops working once a message is received',
        isCorrect: false,
      },
    ],
  },
  {
    order: 24,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Commencez un deuxième brouillon sans envoyer le premier, puis ouvrez le dossier Brouillons : est-il possible d'en avoir plusieurs en attente en même temps ?",
    textEn:
      "Start a second draft without sending the first one, then open the Drafts folder: can you have several pending drafts at the same time?",
    hintFr: "Rien ne limite le nombre de brouillons en attente.",
    hintEn: "Nothing limits the number of pending drafts.",
    explanationFr:
      "Vous pouvez laisser plusieurs messages en brouillon simultanément, sans limite particulière.",
    explanationEn:
      "You can leave several messages as drafts at once, with no particular limit.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 25,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Vous ne trouvez plus un message envoyé il y a plusieurs semaines : que faire en priorité ?",
    textEn:
      "You can't find a message sent several weeks ago: what should you do first?",
    hintFr: "Le dossier concerné a sa propre barre de recherche.",
    hintEn: "The relevant folder has its own search bar.",
    explanationFr:
      "Chercher dans le dossier Envoyés avec la barre de recherche, plutôt que de faire défiler tous les messages.",
    explanationEn:
      "Search the Sent folder using the search bar, rather than scrolling through every message.",
    options: [
      {
        textFr: "Chercher dans le dossier Envoyés avec la barre de recherche",
        textEn: "Search the Sent folder with the search bar",
        isCorrect: true,
      },
      {
        textFr: "Supprimer tous les autres messages",
        textEn: "Delete every other message",
        isCorrect: false,
      },
      {
        textFr: "Créer un nouveau compte",
        textEn: "Create a new account",
        isCorrect: false,
      },
      {
        textFr: "Appeler l'école pour qu'elle le retrouve",
        textEn: "Call the school to have them find it",
        isCorrect: false,
      },
    ],
  },
  {
    order: 26,
    type: "MCQ_MULTI",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Quelles actions sont possibles sur un message reçu ? (plusieurs réponses)",
    textEn:
      "Which actions are possible on a received message? (select all that apply)",
    hintFr: "Ouvrez un message reçu et regardez les boutons disponibles.",
    hintEn: "Open a received message and look at the available buttons.",
    explanationFr:
      "Vous pouvez répondre et archiver un message reçu — jamais le transférer hors de l'application ou le publier ailleurs.",
    explanationEn:
      "You can reply to and archive a received message — never forward it outside the app or publish it elsewhere.",
    options: [
      { textFr: "Répondre", textEn: "Reply", isCorrect: true },
      { textFr: "Archiver", textEn: "Archive", isCorrect: true },
      {
        textFr: "Le transférer vers un numéro WhatsApp externe",
        textEn: "Forward it to an external WhatsApp number",
        isCorrect: false,
      },
      {
        textFr: "Le publier sur le fil d'actualité de l'école",
        textEn: "Publish it on the school's feed",
        isCorrect: false,
      },
    ],
  },
  {
    order: 27,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Archiver un message empêche définitivement d'y répondre plus tard.",
    textEn: "Archiving a message permanently prevents replying to it later.",
    hintFr: "Revoyez ce que fait réellement l'archivage.",
    hintEn: "Think back to what archiving actually does.",
    explanationFr:
      "Faux : l'archivage range le message, il ne bloque aucune action, y compris répondre.",
    explanationEn:
      "False: archiving just puts the message aside, it doesn't block any action, including replying.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 28,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Quelle est la différence entre supprimer et archiver un message, dans la logique de l'application ?",
    textEn:
      "What's the difference between deleting and archiving a message, in the app's logic?",
    hintFr: "Il n'existe pas de corbeille dans la messagerie.",
    hintEn: "There is no trash folder in messaging.",
    explanationFr:
      "L'application ne propose pas de suppression définitive : seul l'archivage permet de ranger un message hors de la boîte de réception.",
    explanationEn:
      "The app doesn't offer permanent deletion: only archiving lets you move a message out of the inbox.",
    options: [
      {
        textFr:
          "L'application ne propose pas de suppression définitive, seulement l'archivage",
        textEn: "The app doesn't offer permanent deletion, only archiving",
        isCorrect: true,
      },
      {
        textFr: "Ce sont deux mots pour la même action",
        textEn: "They are two words for the same action",
        isCorrect: false,
      },
      {
        textFr: "La suppression est réversible, pas l'archivage",
        textEn: "Deletion is reversible, archiving isn't",
        isCorrect: false,
      },
      {
        textFr: "Archiver renvoie le message à l'expéditeur",
        textEn: "Archiving sends the message back to the sender",
        isCorrect: false,
      },
    ],
  },
  {
    order: 29,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      "Quel est l'intérêt principal de la messagerie interne par rapport à un appel téléphonique à l'école ?",
    textEn:
      "What's the main benefit of in-app messaging compared with calling the school?",
    hintFr: "Un appel ne laisse pas de trace consultable plus tard.",
    hintEn: "A call doesn't leave a record you can check later.",
    explanationFr:
      "Elle garde une trace écrite consultable à tout moment, contrairement à un appel téléphonique.",
    explanationEn:
      "It keeps a written record you can check at any time, unlike a phone call.",
    options: [
      {
        textFr: "Garder une trace écrite consultable à tout moment",
        textEn: "Keeping a written record you can check at any time",
        isCorrect: true,
      },
      {
        textFr: "Aucun, c'est équivalent",
        textEn: "None, it's the same",
        isCorrect: false,
      },
      {
        textFr: "C'est plus lent dans tous les cas",
        textEn: "It's always slower",
        isCorrect: false,
      },
      {
        textFr: "Elle ne sert qu'aux urgences",
        textEn: "It's only for emergencies",
        isCorrect: false,
      },
    ],
  },
  {
    order: 30,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr:
      'Que se passe-t-il si vous cliquez sur "Répondre" puis changez d\'avis sans envoyer ?',
    textEn:
      'What happens if you click "Reply" then change your mind without sending?',
    hintFr: "Comme tout message en cours de rédaction, il est conservé.",
    hintEn: "Like any message being written, it's kept.",
    explanationFr:
      "Le message reste en brouillon, rien n'est envoyé tant que vous ne cliquez pas sur Envoyer.",
    explanationEn:
      "The message stays as a draft, nothing is sent until you click Send.",
    options: [
      {
        textFr: "Le message reste en brouillon, rien n'est envoyé",
        textEn: "The message stays as a draft, nothing is sent",
        isCorrect: true,
      },
      {
        textFr: "Il part automatiquement après 5 minutes",
        textEn: "It's automatically sent after 5 minutes",
        isCorrect: false,
      },
      {
        textFr: "Le message original est supprimé",
        textEn: "The original message is deleted",
        isCorrect: false,
      },
      {
        textFr: "Vous ne pouvez plus revenir en arrière",
        textEn: "You can't go back",
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
