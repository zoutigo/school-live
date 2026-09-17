import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/messagerie";

const CHAPTER = {
  role: "TEACHER",
  moduleKey: "messagerie",
  order: 4,
  icon: "MessageSquare",
  colorFrom: "#7C5CBF",
  colorTo: "#4E3690",
  titleFr: "Messagerie",
  titleEn: "Messaging",
  descriptionFr:
    "Apprenez à écrire aux parents et à vos collègues, et à organiser vos échanges.",
  descriptionEn:
    "Learn how to write to parents and colleagues, and organize your conversations.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Comment démarrer un nouveau message depuis la messagerie ?",
    textEn: "How do you start a new message from messaging?",
    hintFr: "Un bouton porte exactement cette action.",
    hintEn: "A button carries exactly that action.",
    explanationFr: 'En cliquant sur le bouton "Nouveau message".',
    explanationEn: 'By clicking the "New message" button.',
    options: [
      {
        textFr: 'Avec le bouton "Nouveau message"',
        textEn: 'With the "New message" button',
        isCorrect: true,
      },
      {
        textFr: "En appelant l'école",
        textEn: "By calling the school",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas possible depuis l'application",
        textEn: "It isn't possible from the app",
        isCorrect: false,
      },
      {
        textFr: "Depuis les paramètres du compte",
        textEn: "From account settings",
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
      "Quels dossiers retrouvez-vous dans votre messagerie ? (plusieurs réponses)",
    textEn:
      "Which folders do you find in your messaging? (select all that apply)",
    hintFr: "Il n'y a pas de corbeille.",
    hintEn: "There is no trash folder.",
    explanationFr: "Boîte de réception, Envoyés, Brouillons et Archives.",
    explanationEn: "Inbox, Sent, Drafts and Archive.",
    options: [
      { textFr: "Boîte de réception", textEn: "Inbox", isCorrect: true },
      { textFr: "Envoyés", textEn: "Sent", isCorrect: true },
      { textFr: "Brouillons", textEn: "Drafts", isCorrect: true },
      { textFr: "Archives", textEn: "Archive", isCorrect: true },
    ],
  },
  {
    order: 3,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Quels destinataires pouvez-vous ajouter en rédigeant un message ?",
    textEn: "Which recipients can you add while composing a message?",
    hintFr: "Deux boutons dédiés existent pour cela.",
    hintEn: "Two dedicated buttons exist for this.",
    explanationFr:
      "Un enseignant ou un membre du personnel, via les boutons dédiés.",
    explanationEn: "A teacher or a staff member, via the dedicated buttons.",
    options: [
      {
        textFr: "Un enseignant ou un personnel",
        textEn: "A teacher or a staff member",
        isCorrect: true,
      },
      {
        textFr: "Uniquement le directeur",
        textEn: "Only the principal",
        isCorrect: false,
      },
      {
        textFr: "Personne, il faut une adresse email externe",
        textEn: "No one, an external email address is required",
        isCorrect: false,
      },
      {
        textFr: "Uniquement des groupes classe entiers",
        textEn: "Only whole class groups",
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
      "Un message que vous commencez à écrire sans l'envoyer est automatiquement enregistré en brouillon.",
    textEn:
      "A message you start writing without sending it is automatically saved as a draft.",
    hintFr: "C'est justement le rôle du dossier Brouillons.",
    hintEn: "That's precisely the role of the Drafts folder.",
    explanationFr:
      "Vrai : vous le retrouvez dans le dossier Brouillons pour le terminer plus tard.",
    explanationEn: "True: you find it in the Drafts folder to finish it later.",
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
    textFr: "Où retrouvez-vous un message une fois qu'il a été envoyé ?",
    textEn: "Where do you find a message once it has been sent?",
    hintFr: "Son nom l'indique directement.",
    hintEn: "Its name says it directly.",
    explanationFr: "Dans le dossier Envoyés.",
    explanationEn: "In the Sent folder.",
    options: [
      { textFr: "Envoyés", textEn: "Sent", isCorrect: true },
      { textFr: "Brouillons", textEn: "Drafts", isCorrect: false },
      { textFr: "Archives", textEn: "Archive", isCorrect: false },
      { textFr: "Boîte de réception", textEn: "Inbox", isCorrect: false },
    ],
  },
  {
    order: 6,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Vous avez traité une conversation et souhaitez la ranger sans la supprimer : quel dossier utilisez-vous ?",
    textEn:
      "You've handled a conversation and want to put it away without deleting it: which folder do you use?",
    hintFr: "Ce n'est ni la corbeille, ni les brouillons.",
    hintEn: "It's neither trash nor drafts.",
    explanationFr: "Les Archives.",
    explanationEn: "The Archive.",
    options: [
      { textFr: "Archives", textEn: "Archive", isCorrect: true },
      { textFr: "Brouillons", textEn: "Drafts", isCorrect: false },
      { textFr: "Envoyés", textEn: "Sent", isCorrect: false },
      {
        textFr: "Il faut la supprimer, il n'y a pas d'autre solution",
        textEn: "You have to delete it, there is no other option",
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
    textFr: "Vous pouvez joindre une pièce jointe à un message.",
    textEn: "You can attach a file to a message.",
    hintFr: "Un champ dédié le permet dans la fenêtre de rédaction.",
    hintEn: "A dedicated field allows this in the compose window.",
    explanationFr:
      "Vrai : la fenêtre de rédaction propose une zone Pièces jointes.",
    explanationEn: "True: the compose window offers an Attachments area.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 8,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Quels champs sont nécessaires pour envoyer un nouveau message ?",
    textEn: "Which fields are needed to send a new message?",
    hintFr: "Trois éléments : à qui, sur quoi, et quoi dire.",
    hintEn: "Three elements: to whom, about what, and what to say.",
    explanationFr: "Au moins un destinataire, un sujet et un message.",
    explanationEn: "At least one recipient, a subject and a message.",
    options: [
      {
        textFr: "Destinataire, sujet et message",
        textEn: "Recipient, subject and message",
        isCorrect: true,
      },
      {
        textFr: "Uniquement le message",
        textEn: "Only the message",
        isCorrect: false,
      },
      {
        textFr: "Uniquement le destinataire",
        textEn: "Only the recipient",
        isCorrect: false,
      },
      {
        textFr: "Une pièce jointe obligatoire",
        textEn: "A mandatory attachment",
        isCorrect: false,
      },
    ],
  },
  {
    order: 9,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Vous pouvez rechercher un message plutôt que de faire défiler toute la liste.",
    textEn:
      "You can search for a message rather than scroll through the whole list.",
    hintFr: "Une barre de recherche est disponible.",
    hintEn: "A search bar is available.",
    explanationFr:
      "Vrai : la barre de recherche permet de retrouver rapidement une conversation.",
    explanationEn: "True: the search bar lets you quickly find a conversation.",
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
      "Quel filtre permet d'afficher uniquement les messages que vous n'avez pas encore lus ?",
    textEn: "Which filter shows only the messages you haven't read yet?",
    hintFr: "Son nom est très direct.",
    hintEn: "Its name is very direct.",
    explanationFr: 'Le filtre "Non lus".',
    explanationEn: 'The "Unread" filter.',
    options: [
      { textFr: "Non lus", textEn: "Unread", isCorrect: true },
      { textFr: "Archives", textEn: "Archive", isCorrect: false },
      { textFr: "Envoyés", textEn: "Sent", isCorrect: false },
      { textFr: "Brouillons", textEn: "Drafts", isCorrect: false },
    ],
  },
  {
    order: 11,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      'Ouvrez la messagerie, cliquez sur "Nouveau message" et ajoutez un enseignant comme destinataire : quel bouton avez-vous utilisé ?',
    textEn:
      'Open messaging, click "New message" and add a teacher as recipient: which button did you use?',
    hintFr: "Son libellé nomme directement le type de destinataire.",
    hintEn: "Its label directly names the recipient type.",
    explanationFr: '"Ajouter un enseignant".',
    explanationEn: '"Add a teacher".',
    options: [
      {
        textFr: "Ajouter un enseignant",
        textEn: "Add a teacher",
        isCorrect: true,
      },
      {
        textFr: "Ajouter un personnel",
        textEn: "Add a staff member",
        isCorrect: false,
      },
      { textFr: "Nouveau message", textEn: "New message", isCorrect: false },
      { textFr: "Rechercher", textEn: "Search", isCorrect: false },
    ],
  },
  {
    order: 12,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Rédigez un message puis quittez la page sans l'envoyer et sans l'enregistrer explicitement : une confirmation vous est-elle proposée ?",
    textEn:
      "Write a message then leave the page without sending or explicitly saving it: are you prompted to confirm?",
    hintFr:
      "L'application évite de perdre une rédaction en cours par accident.",
    hintEn: "The app avoids accidentally losing a draft in progress.",
    explanationFr:
      'Vrai : une confirmation "Quitter la rédaction ?" protège votre brouillon en cours.',
    explanationEn:
      'True: a "Leave draft?" confirmation protects your work in progress.',
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
      "Ouvrez un message reçu et répondez-y : quel préfixe est ajouté automatiquement au sujet ?",
    textEn:
      "Open a received message and reply: which prefix is automatically added to the subject?",
    hintFr: "C'est une convention classique de messagerie.",
    hintEn: "It's a classic messaging convention.",
    explanationFr: '"Re", suivi du sujet d\'origine.',
    explanationEn: '"Re", followed by the original subject.',
    options: [
      { textFr: "Re", textEn: "Re", isCorrect: true },
      { textFr: "Tr", textEn: "Fwd", isCorrect: false },
      { textFr: "Nouveau", textEn: "New", isCorrect: false },
      { textFr: "Aucun préfixe", textEn: "No prefix", isCorrect: false },
    ],
  },
  {
    order: 14,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Transférez un message à un collègue : quel préfixe est ajouté au sujet cette fois ?",
    textEn:
      "Forward a message to a colleague: which prefix is added to the subject this time?",
    hintFr: "C'est différent du préfixe utilisé pour une réponse.",
    hintEn: "It differs from the prefix used for a reply.",
    explanationFr: '"Tr", pour transfert.',
    explanationEn: '"Fwd", for forward.',
    options: [
      { textFr: "Tr", textEn: "Fwd", isCorrect: true },
      { textFr: "Re", textEn: "Re", isCorrect: false },
      { textFr: "Copie", textEn: "Copy", isCorrect: false },
      { textFr: "Aucun préfixe", textEn: "No prefix", isCorrect: false },
    ],
  },
  {
    order: 15,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Archivez un message depuis la boîte de réception : reste-t-il consultable ensuite dans le dossier Archives ?",
    textEn:
      "Archive a message from the inbox: is it still viewable afterwards in the Archive folder?",
    hintFr: "Archiver n'est pas supprimer.",
    hintEn: "Archiving is not deleting.",
    explanationFr:
      "Vrai : le message reste consultable, simplement rangé hors de la boîte de réception.",
    explanationEn:
      "True: the message stays viewable, simply moved out of the inbox.",
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
      "Ouvrez un brouillon existant et terminez-le : quel sujet par défaut portait-il tant qu'il n'en avait pas ?",
    textEn:
      "Open an existing draft and finish it: what default subject did it carry until it had one?",
    hintFr: "C'est un texte de remplacement, pas un champ vide.",
    hintEn: "It's a placeholder text, not an empty field.",
    explanationFr: '"Brouillon sans objet".',
    explanationEn: '"Draft without subject".',
    options: [
      {
        textFr: "Brouillon sans objet",
        textEn: "Draft without subject",
        isCorrect: true,
      },
      { textFr: "Nouveau message", textEn: "New message", isCorrect: false },
      { textFr: "Sans titre", textEn: "Untitled", isCorrect: false },
      { textFr: "Urgent", textEn: "Urgent", isCorrect: false },
    ],
  },
  {
    order: 17,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Pourquoi séparer les dossiers Envoyés et Archives plutôt que de tout regrouper au même endroit ?",
    textEn:
      "Why separate the Sent and Archive folders instead of grouping everything in one place?",
    hintFr: "L'un dépend de qui a écrit, l'autre d'une décision de rangement.",
    hintEn: "One depends on who wrote it, the other on a filing decision.",
    explanationFr:
      "Envoyés regroupe automatiquement ce que vous avez écrit, alors qu'Archives est un rangement volontaire, pour des messages reçus ou envoyés déjà traités.",
    explanationEn:
      "Sent automatically groups what you wrote, while Archive is a voluntary filing choice, for received or sent messages already handled.",
    options: [
      {
        textFr: "Envoyés est automatique, Archives est un rangement volontaire",
        textEn: "Sent is automatic, Archive is a voluntary filing choice",
        isCorrect: true,
      },
      {
        textFr: "Ce sont deux noms pour le même dossier",
        textEn: "They are two names for the same folder",
        isCorrect: false,
      },
      {
        textFr: "Archives ne contient que des brouillons",
        textEn: "Archive only contains drafts",
        isCorrect: false,
      },
      {
        textFr: "Envoyés se vide automatiquement chaque mois",
        textEn: "Sent empties itself automatically every month",
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
      "Un message envoyé à un parent utilise le même système de conversation qu'un message envoyé à un collègue enseignant.",
    textEn:
      "A message sent to a parent uses the same conversation system as a message sent to a fellow teacher.",
    hintFr:
      "Les dossiers (réception, envoyés, brouillons, archives) sont communs à tous les destinataires.",
    hintEn:
      "The folders (inbox, sent, drafts, archive) are common to all recipients.",
    explanationFr:
      "Vrai : c'est la même messagerie et les mêmes dossiers, quel que soit le type de destinataire.",
    explanationEn:
      "True: it's the same messaging system and the same folders, whatever the recipient type.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 19,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Vous recevez une demande d'un parent nécessitant une vérification avant de répondre : quelle combinaison d'actions correspond le mieux à ce cas ?",
    textEn:
      "You receive a parent's request that needs checking before you reply: which combination of actions best fits this case?",
    hintFr:
      "Vous ne répondez pas tout de suite, mais vous ne perdez pas le message non plus.",
    hintEn:
      "You don't reply right away, but you don't lose the message either.",
    explanationFr:
      "Laisser le message dans la boîte de réception (ou le marquer non lu) le temps de vérifier, puis y répondre une fois l'information confirmée.",
    explanationEn:
      "Leave the message in the inbox (or mark it unread) while you check, then reply once the information is confirmed.",
    options: [
      {
        textFr: "Le laisser en boîte de réception, vérifier, puis répondre",
        textEn: "Leave it in the inbox, check, then reply",
        isCorrect: true,
      },
      {
        textFr: "Le supprimer immédiatement",
        textEn: "Delete it immediately",
        isCorrect: false,
      },
      {
        textFr: "L'archiver sans avoir répondu",
        textEn: "Archive it without replying",
        isCorrect: false,
      },
      {
        textFr: "Ignorer et attendre que le parent relance",
        textEn: "Ignore it and wait for the parent to follow up",
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
      "Une fois qu'un message est envoyé, vous pouvez encore en modifier le contenu depuis le dossier Envoyés.",
    textEn:
      "Once a message is sent, you can still edit its content from the Sent folder.",
    hintFr: "Seul un brouillon peut être modifié avant envoi.",
    hintEn: "Only a draft can be edited before sending.",
    explanationFr:
      "Faux : un message envoyé est définitif, seul un brouillon reste modifiable.",
    explanationEn:
      "False: a sent message is final, only a draft stays editable.",
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
