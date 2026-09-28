import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/utilisateurs";

const CHAPTER = {
  role: "SCHOOL_ADMIN",
  moduleKey: "utilisateurs",
  order: 1,
  icon: "Users",
  colorFrom: "#7C3AED",
  colorTo: "#5B21B6",
  titleFr: "Utilisateurs",
  titleEn: "Users",
  descriptionFr:
    "Apprenez à créer des comptes, assigner des rôles, rattacher parents et élèves, et gérer les accès de votre école.",
  descriptionEn:
    "Learn how to create accounts, assign roles, link parents and students, and manage your school's access.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quel type de compte NE PEUT PAS être créé depuis l'écran Utilisateurs ?",
    textEn: "Which account type CANNOT be created from the Users screen?",
    hintFr: "C'est un rôle aussi puissant que le vôtre.",
    hintEn: "It's a role as powerful as yours.",
    explanationFr:
      "Administrateur d'école : ce rôle n'apparaît pas dans la liste des types créables.",
    explanationEn:
      "School Admin: this role doesn't appear in the list of creatable types.",
    options: [
      {
        textFr: "Administrateur d'école",
        textEn: "School Admin",
        isCorrect: true,
      },
      { textFr: "Enseignant", textEn: "Teacher", isCorrect: false },
      { textFr: "Parent", textEn: "Parent", isCorrect: false },
      { textFr: "Surveillant", textEn: "Supervisor", isCorrect: false },
    ],
  },
  {
    order: 2,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quels modes de contact peut-on choisir en créant un compte avec accès ? (plusieurs réponses)",
    textEn:
      "Which contact modes can you choose when creating an account with access? (select all that apply)",
    hintFr: "Il y en a exactement deux.",
    hintEn: "There are exactly two.",
    explanationFr: "Téléphone + code PIN, ou email + mot de passe.",
    explanationEn: "Phone + PIN code, or email + password.",
    options: [
      {
        textFr: "Téléphone + code PIN",
        textEn: "Phone + PIN code",
        isCorrect: true,
      },
      {
        textFr: "Email + mot de passe",
        textEn: "Email + password",
        isCorrect: true,
      },
      {
        textFr: "Réseau social uniquement",
        textEn: "Social network only",
        isCorrect: false,
      },
      {
        textFr: "Aucun contact requis",
        textEn: "No contact required",
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
      "Un élève peut être créé avec seulement son identité et sa classe, sans accès de connexion.",
    textEn:
      "A student can be created with just their identity and class, without any login access.",
    hintFr: "L'accès de connexion est précisé comme optionnel pour ce type.",
    hintEn: "Login access is explicitly marked optional for this type.",
    explanationFr:
      "Vrai : l'identité et la classe sont obligatoires ; l'élève est créé sans compte, l'accès (identifiant + mot de passe) se crée ensuite via \"Créer l'accès\" sur sa fiche.",
    explanationEn:
      'True: identity and class are required; the student is created without an account, access (username + password) is created afterwards via "Create access" on their profile.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 4,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Lesquels de ces filtres de rôle existent réellement dans le module Utilisateurs ? (plusieurs réponses)",
    textEn:
      "Which of these role filters actually exist in the Users module? (select all that apply)",
    hintFr: "Un des quatre est inventé.",
    hintEn: "One of the four is made up.",
    explanationFr: "Enseignants, Parents et Élèves existent ; pas le reste.",
    explanationEn: "Teachers, Parents and Students exist; not the other one.",
    options: [
      { textFr: "Enseignants", textEn: "Teachers", isCorrect: true },
      { textFr: "Parents", textEn: "Parents", isCorrect: true },
      { textFr: "Élèves", textEn: "Students", isCorrect: true },
      {
        textFr: "Élus du conseil des parents",
        textEn: "Parent council members",
        isCorrect: false,
      },
    ],
  },
  {
    order: 5,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "On peut filtrer la liste selon que l'utilisateur possède un compte ou non.",
    textEn:
      "You can filter the list by whether the user has an account or not.",
    hintFr: "Deux filtres complémentaires existent à ce sujet.",
    hintEn: "Two complementary filters exist for this.",
    explanationFr:
      'Vrai : les filtres "Avec compte" et "Sans compte" existent.',
    explanationEn:
      'True: the "With account" and "Without account" filters exist.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 6,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Lequel de ces statuts de compte n'existe PAS dans ce module ?",
    textEn: "Which of these account statuses does NOT exist in this module?",
    hintFr: "Les trois vrais statuts décrivent le cycle d'activation.",
    hintEn: "The three real statuses describe the activation cycle.",
    explanationFr:
      '"Archivé" n\'existe pas : les statuts sont pending/active/suspended.',
    explanationEn:
      '"Archived" doesn\'t exist: the statuses are pending/active/suspended.',
    options: [
      { textFr: "Archivé", textEn: "Archived", isCorrect: true },
      { textFr: "En attente", textEn: "Pending", isCorrect: false },
      { textFr: "Actif", textEn: "Active", isCorrect: false },
      { textFr: "Suspendu", textEn: "Suspended", isCorrect: false },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Juste après avoir créé un compte avec identifiants générés, que voyez-vous s'afficher ?",
    textEn:
      "Right after creating an account with generated credentials, what appears?",
    hintFr: "Ces informations ne seront plus jamais réaffichées en clair.",
    hintEn: "This information will never be shown in clear text again.",
    explanationFr:
      "Une fenêtre avec l'identifiant et le mot de passe (ou PIN) temporaire.",
    explanationEn:
      "A window with the username and the temporary password (or PIN).",
    options: [
      {
        textFr: "L'identifiant et le mot de passe/PIN temporaire",
        textEn: "The username and the temporary password/PIN",
        isCorrect: true,
      },
      {
        textFr: "Rien, il faut le redemander plus tard",
        textEn: "Nothing, you must ask for it again later",
        isCorrect: false,
      },
      {
        textFr: "Un lien de confirmation par SMS",
        textEn: "An SMS confirmation link",
        isCorrect: false,
      },
      {
        textFr: "La photo de profil de l'utilisateur",
        textEn: "The user's profile photo",
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
    textFr: "Un utilisateur peut cumuler plusieurs rôles à la fois.",
    textEn: "A user can hold several roles at the same time.",
    hintFr:
      "La modale d'édition des rôles utilise des cases à cocher, pas un choix unique.",
    hintEn: "The role editing modal uses checkboxes, not a single choice.",
    explanationFr:
      "Vrai : les rôles se cochent, un même compte peut en avoir plusieurs.",
    explanationEn: "True: roles are checkboxes, one account can hold several.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 9,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Combien de rôles minimum un utilisateur doit-il conserver après modification ?",
    textEn: "How many roles must a user keep at minimum after editing?",
    hintFr: "Enlever le dernier rôle coché déclenche une erreur.",
    hintEn: "Unchecking the last remaining role triggers an error.",
    explanationFr: "Un seul rôle minimum : la liste ne peut pas être vide.",
    explanationEn: "At least one role: the list cannot be empty.",
    options: [
      { textFr: "1", textEn: "1", isCorrect: true },
      { textFr: "0", textEn: "0", isCorrect: false },
      { textFr: "2", textEn: "2", isCorrect: false },
      { textFr: "Aucune limite", textEn: "No limit", isCorrect: false },
    ],
  },
  {
    order: 10,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      'Filtrez sur le rôle Élèves et le filtre "Sans compte" : quelle action permet de donner un accès de connexion à l\'un de ces élèves ?',
    textEn:
      'Filter by the Student role and the "Without account" filter: which action gives one of these students login access?',
    hintFr: "C'est l'action dédiée aux comptes encore inexistants.",
    hintEn: "It's the action dedicated to accounts that don't exist yet.",
    explanationFr:
      '"Créer un accès" (promotion de l\'élève vers un compte actif).',
    explanationEn:
      '"Create access" (promoting the student to an active account).',
    options: [
      {
        textFr: "Créer un accès",
        textEn: "Create access",
        isCorrect: true,
      },
      {
        textFr: "Modifier les rôles",
        textEn: "Edit roles",
        isCorrect: false,
      },
      {
        textFr: "Réinitialiser le mot de passe",
        textEn: "Reset password",
        isCorrect: false,
      },
      { textFr: "Message", textEn: "Message", isCorrect: false },
    ],
  },
  {
    order: 11,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      'Ouvrez la fiche d\'un élève et lancez "Assigner un parent" : quels sont les deux sous-modes proposés ?',
    textEn:
      'Open a student\'s profile and start "Assign a parent": which two sub-modes are offered?',
    hintFr: "L'un réutilise un compte déjà présent dans l'école, l'autre non.",
    hintEn: "One reuses an account already in the school, the other doesn't.",
    explanationFr: "Parent existant, ou nouveau parent.",
    explanationEn: "Existing parent, or new parent.",
    options: [
      {
        textFr: "Parent existant / Nouveau parent",
        textEn: "Existing parent / New parent",
        isCorrect: true,
      },
      {
        textFr: "Père / Mère",
        textEn: "Father / Mother",
        isCorrect: false,
      },
      {
        textFr: "Tuteur légal / Autre",
        textEn: "Legal guardian / Other",
        isCorrect: false,
      },
      {
        textFr: "Urgence / Non urgence",
        textEn: "Emergency / Non-emergency",
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
      "Ouvrez \"Modifier les rôles\" pour un enseignant, décochez tous les rôles, puis essayez d'enregistrer : l'opération est refusée.",
    textEn:
      'Open "Edit roles" for a teacher, uncheck every role, then try to save: the operation is rejected.',
    hintFr: "Repensez au nombre minimum de rôles autorisé.",
    hintEn: "Think back to the minimum number of roles allowed.",
    explanationFr: "Vrai : un message impose de conserver au moins un rôle.",
    explanationEn: "True: a message requires keeping at least one role.",
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
      "Vous créez un compte de type Personnel avec une fonction personnalisée (ex. \"Comptable adjoint\") qui n'existe pas encore : où la définissez-vous d'abord ?",
    textEn:
      'You create a Staff account with a custom function (e.g. "Assistant accountant") that doesn\'t exist yet: where do you define it first?',
    hintFr: "Une section distincte liste les fonctions avant de les assigner.",
    hintEn: "A separate section lists functions before assigning them.",
    explanationFr:
      "Dans la section des fonctions du personnel, avant de l'assigner à un utilisateur.",
    explanationEn:
      "In the staff functions section, before assigning it to a user.",
    options: [
      {
        textFr: "Dans la section des fonctions du personnel",
        textEn: "In the staff functions section",
        isCorrect: true,
      },
      {
        textFr: "Dans le module Classes",
        textEn: "In the Classes module",
        isCorrect: false,
      },
      {
        textFr: "Elle se crée automatiquement",
        textEn: "It's created automatically",
        isCorrect: false,
      },
      {
        textFr: "Dans Paramètres de l'école",
        textEn: "In School settings",
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
      "Un élève créé directement depuis Utilisateurs a immédiatement une classe attribuée, contrairement à un élève créé depuis Inscriptions qui reste sans classe jusqu'à ce que sa première échéance soit payée.",
    textEn:
      "A student created directly from Users has an assigned class immediately, unlike a student created from Enrollments who stays classless until their first installment is paid.",
    hintFr: "Ce sont deux parcours de création distincts pour un élève.",
    hintEn: "These are two distinct student creation paths.",
    explanationFr:
      "Vrai : Utilisateurs exige une classe à la création, alors qu'Inscriptions place l'élève en attente d'affectation après le premier paiement.",
    explanationEn:
      "True: Users requires a class at creation, while Enrollments places the student in the assignment-waiting pool after the first payment.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 15,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Pourquoi le rôle Administrateur d'école est-il volontairement absent des types de compte créables dans ce module ?",
    textEn:
      "Why is the School Admin role deliberately absent from the account types creatable in this module?",
    hintFr: "C'est le rôle qui a accès à ce module lui-même.",
    hintEn: "It's the role that has access to this module in the first place.",
    explanationFr:
      "C'est un rôle à privilèges élevés : il ne doit pas pouvoir se dupliquer lui-même depuis cet écran, pour éviter tout contournement de contrôle.",
    explanationEn:
      "It's a high-privilege role: it must not be able to self-duplicate from this screen, to avoid bypassing oversight.",
    options: [
      {
        textFr: "C'est un rôle à privilèges élevés, non auto-attribuable ici",
        textEn: "It's a high-privilege role, not self-grantable here",
        isCorrect: true,
      },
      {
        textFr: "C'est un oubli du formulaire",
        textEn: "It's a form oversight",
        isCorrect: false,
      },
      {
        textFr: "Ce rôle n'existe plus dans l'application",
        textEn: "This role no longer exists in the app",
        isCorrect: false,
      },
      {
        textFr: "Il faut d'abord créer une école",
        textEn: "You must first create a school",
        isCorrect: false,
      },
    ],
  },
  {
    order: 16,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quelle action de la fiche utilisateur permet de contacter une famille sans quitter le module Utilisateurs ?",
    textEn:
      "Which action on the user's profile lets you contact a family without leaving the Users module?",
    hintFr: "Elle ouvre la messagerie déjà pré-remplie avec ce destinataire.",
    hintEn: "It opens messaging already pre-filled with that recipient.",
    explanationFr:
      'L\'action "Message" ouvre la messagerie vers cet utilisateur.',
    explanationEn: '"Message" opens messaging towards this user.',
    options: [
      { textFr: "Message", textEn: "Message", isCorrect: true },
      {
        textFr: "Réinitialiser le PIN",
        textEn: "Reset PIN",
        isCorrect: false,
      },
      {
        textFr: "Modifier les rôles",
        textEn: "Edit roles",
        isCorrect: false,
      },
      {
        textFr: "Assigner un enfant",
        textEn: "Assign a child",
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
