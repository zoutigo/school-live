import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const NOTES_LINK = "/classes/{classId}/notes";
const SANTE_LINK = "/classes/{classId}/sante";

const CHAPTER = {
  role: "TEACHER",
  moduleKey: "professeur-referent",
  order: 5,
  icon: "GraduationCap",
  colorFrom: "#C9932F",
  colorTo: "#93691A",
  titleFr: "Professeur référent",
  titleEn: "Homeroom teacher",
  descriptionFr:
    "Découvrez les responsabilités supplémentaires du professeur référent : décision de passage et suivi santé de sa classe.",
  descriptionEn:
    "Discover the extra responsibilities of the homeroom (référent) teacher: promotion decisions and health follow-up for their class.",
  requiresReferentTeacher: true,
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: NOTES_LINK,
    textFr:
      "En tant que professeur référent d'une classe, quel onglet supplémentaire apparaît dans son module Notes ?",
    textEn:
      "As the référent teacher of a class, which extra tab appears in its Notes module?",
    hintFr: "Il concerne le passage des élèves dans la classe supérieure.",
    hintEn: "It concerns whether students move up to the next class.",
    explanationFr: "L'onglet Décision.",
    explanationEn: "The Decision tab.",
    options: [
      { textFr: "Décision", textEn: "Decision", isCorrect: true },
      { textFr: "Santé", textEn: "Health", isCorrect: false },
      { textFr: "Emploi du temps", textEn: "Timetable", isCorrect: false },
      { textFr: "Fil de classe", textEn: "Class feed", isCorrect: false },
    ],
  },
  {
    order: 2,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: NOTES_LINK,
    textFr:
      "Quelles informations le tableau de l'onglet Décision affiche-t-il pour chaque élève ? (plusieurs réponses)",
    textEn:
      "Which information does the Decision tab's table show for each student? (select all that apply)",
    hintFr: "Il permet de statuer en connaissance de cause.",
    hintEn: "It lets you decide with full knowledge of the facts.",
    explanationFr:
      "Les moyennes des trois trimestres, la moyenne annuelle et le rang de l'élève dans la classe.",
    explanationEn:
      "The three term averages, the yearly average and the student's class rank.",
    options: [
      {
        textFr: "Les moyennes des trois trimestres",
        textEn: "The three term averages",
        isCorrect: true,
      },
      {
        textFr: "La moyenne annuelle",
        textEn: "The yearly average",
        isCorrect: true,
      },
      {
        textFr: "Le rang dans la classe",
        textEn: "The class rank",
        isCorrect: true,
      },
      {
        textFr: "Le solde du porte-monnaie des parents",
        textEn: "The parents' wallet balance",
        isCorrect: false,
      },
    ],
  },
  {
    order: 3,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: NOTES_LINK,
    textFr:
      "Quelles décisions pouvez-vous choisir pour chaque élève dans l'onglet Décision ? (plusieurs réponses)",
    textEn:
      "Which decisions can you choose for each student in the Decision tab? (select all that apply)",
    hintFr: "Il y en a trois.",
    hintEn: "There are three.",
    explanationFr: "Passage, Redoublement et Départ.",
    explanationEn: "Promoted, Repeated and Left.",
    options: [
      { textFr: "Passage", textEn: "Promoted", isCorrect: true },
      { textFr: "Redoublement", textEn: "Repeated", isCorrect: true },
      { textFr: "Départ", textEn: "Left", isCorrect: true },
      { textFr: "Exclusion", textEn: "Expelled", isCorrect: false },
    ],
  },
  {
    order: 4,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: NOTES_LINK,
    textFr:
      "Sauf en cas de Départ, vous devez indiquer la classe de destination pour l'année suivante.",
    textEn:
      "Unless the decision is Left, you must indicate the destination class for next year.",
    hintFr:
      "Un élève qui reste dans l'école va toujours quelque part l'an prochain.",
    hintEn: "A student staying at the school always goes somewhere next year.",
    explanationFr:
      "Vrai : Passage ou Redoublement nécessitent tous deux de préciser la classe de destination.",
    explanationEn:
      "True: both Promoted and Repeated require specifying the destination class.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 5,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: NOTES_LINK,
    textFr:
      "L'appréciation générale du conseil de classe, en plus des appréciations par matière, ne peut être rédigée que par le professeur référent.",
    textEn:
      "The class council's general appreciation, in addition to per-subject appreciations, can only be written by the référent teacher.",
    hintFr: "Les autres enseignants ne voient que leur propre matière.",
    hintEn: "Other teachers only see their own subject.",
    explanationFr:
      "Vrai : c'est un privilège du professeur référent, qui résume l'avis du conseil sur l'ensemble du trimestre.",
    explanationEn:
      "True: it's a référent-only privilege, summarizing the council's view on the whole term.",
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
    deepLinkRoute: SANTE_LINK,
    textFr:
      "Quel module supplémentaire un professeur référent peut-il consulter pour sa classe ?",
    textEn:
      "Which extra module can a référent teacher consult for their class?",
    hintFr: "Il concerne le bien-être physique des élèves.",
    hintEn: "It concerns students' physical well-being.",
    explanationFr: "Le module Santé.",
    explanationEn: "The Health module.",
    options: [
      { textFr: "Santé", textEn: "Health", isCorrect: true },
      { textFr: "Finances", textEn: "Finance", isCorrect: false },
      { textFr: "Recrutement", textEn: "Recruitment", isCorrect: false },
      { textFr: "Aucun", textEn: "None", isCorrect: false },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: SANTE_LINK,
    textFr:
      "Que voyez-vous en premier en ouvrant le module Santé de votre classe en tant que référent ?",
    textEn:
      "What do you see first when opening your class's Health module as référent?",
    hintFr: "C'est une vue d'ensemble avant le détail d'un élève.",
    hintEn: "It's an overview before a student's detail.",
    explanationFr:
      "La liste des élèves de la classe, avec le nombre de conditions actives et le niveau d'alerte le plus élevé de chacun.",
    explanationEn:
      "The class roster, with each student's active conditions count and highest alert level.",
    options: [
      {
        textFr: "La liste des élèves avec leur niveau d'alerte",
        textEn: "The student roster with their alert level",
        isCorrect: true,
      },
      {
        textFr: "Le dossier médical complet de toute la classe d'un coup",
        textEn: "The whole class's full medical file at once",
        isCorrect: false,
      },
      {
        textFr: "Un formulaire vierge à remplir",
        textEn: "A blank form to fill in",
        isCorrect: false,
      },
      {
        textFr: "La messagerie de l'infirmerie",
        textEn: "The infirmary's messaging",
        isCorrect: false,
      },
    ],
  },
  {
    order: 8,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: SANTE_LINK,
    textFr:
      "Quels niveaux d'alerte peuvent être affichés à côté d'un élève ? (plusieurs réponses)",
    textEn:
      "Which alert levels can be shown next to a student? (select all that apply)",
    hintFr: "Il y en a trois, du plus léger au plus grave.",
    hintEn: "There are three, from lightest to most severe.",
    explanationFr: "Info, Attention et Urgent.",
    explanationEn: "Info, Attention and Urgent.",
    options: [
      { textFr: "Info", textEn: "Info", isCorrect: true },
      { textFr: "Attention", textEn: "Attention", isCorrect: true },
      { textFr: "Urgent", textEn: "Urgent", isCorrect: true },
      { textFr: "Confidentiel", textEn: "Confidential", isCorrect: false },
    ],
  },
  {
    order: 9,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: SANTE_LINK,
    textFr:
      "En cliquant sur un élève dans le module Santé, vous accédez à sa fiche complète en lecture seule.",
    textEn:
      "Clicking a student in the Health module gives you access to their full file, read-only.",
    hintFr: "Un référent consulte, il ne modifie pas les conditions de santé.",
    hintEn: "A référent views, they don't edit health conditions.",
    explanationFr:
      "Vrai : la fiche santé de l'élève s'ouvre en lecture seule pour le professeur référent.",
    explanationEn:
      "True: the student's health file opens read-only for the référent teacher.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 10,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: NOTES_LINK,
    textFr:
      "Un enseignant qui enseigne dans cette classe mais qui n'en est pas le référent peut aussi accéder aux onglets Décision et Santé.",
    textEn:
      "A teacher who teaches in this class but isn't its référent can also access the Decision and Health tabs.",
    hintFr:
      "L'accès est vérifié indépendamment côté serveur, pas seulement caché dans l'interface.",
    hintEn:
      "Access is checked independently server-side, not just hidden in the interface.",
    explanationFr:
      "Faux : ces deux accès sont réservés au seul professeur référent de la classe, contrôlé côté serveur.",
    explanationEn:
      "False: both accesses are reserved to the class's référent teacher only, enforced server-side.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 11,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: NOTES_LINK,
    textFr:
      'Ouvrez l\'onglet Décision de votre classe et enregistrez une décision "Passage" pour un élève : quelle information devez-vous choisir en plus ?',
    textEn:
      'Open your class\'s Decision tab and save a "Promoted" decision for a student: what extra information must you choose?',
    hintFr: "C'est là où l'élève ira l'an prochain.",
    hintEn: "It's where the student will go next year.",
    explanationFr: "La classe de destination pour l'année suivante.",
    explanationEn: "The destination class for next year.",
    options: [
      {
        textFr: "La classe de destination",
        textEn: "The destination class",
        isCorrect: true,
      },
      {
        textFr: "Le nouveau montant des frais de scolarité",
        textEn: "The new tuition fee amount",
        isCorrect: false,
      },
      {
        textFr: "Un nouveau mot de passe pour l'élève",
        textEn: "A new password for the student",
        isCorrect: false,
      },
      {
        textFr: "Rien d'autre",
        textEn: "Nothing else",
        isCorrect: false,
      },
    ],
  },
  {
    order: 12,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: SANTE_LINK,
    textFr:
      "Ouvrez le module Santé de votre classe : les élèves sans aucune condition active affichent-ils un badge de niveau d'alerte ?",
    textEn:
      "Open your class's Health module: do students with no active condition show an alert level badge?",
    hintFr: "Le badge n'apparaît que s'il y a quelque chose à signaler.",
    hintEn: "The badge only appears when there is something to flag.",
    explanationFr:
      "Faux : sans condition active, aucun badge de niveau d'alerte n'est affiché pour l'élève.",
    explanationEn:
      "False: with no active condition, no alert level badge is shown for the student.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 13,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: NOTES_LINK,
    textFr:
      "Ouvrez l'onglet Conseil de classe et rédigez l'appréciation générale : à quelle portée correspond-elle, par rapport aux appréciations par matière ?",
    textEn:
      "Open the Class Council tab and write the general appreciation: what scope does it cover, compared with per-subject appreciations?",
    hintFr: "Elle synthétise plutôt que de détailler une seule matière.",
    hintEn: "It summarizes rather than detailing a single subject.",
    explanationFr:
      "Elle résume l'ensemble du trimestre de l'élève, au-delà d'une seule matière.",
    explanationEn:
      "It summarizes the student's whole term, beyond a single subject.",
    options: [
      {
        textFr: "L'ensemble du trimestre, toutes matières confondues",
        textEn: "The whole term, across all subjects",
        isCorrect: true,
      },
      {
        textFr: "Uniquement votre propre matière",
        textEn: "Only your own subject",
        isCorrect: false,
      },
      {
        textFr: "Uniquement le comportement en récréation",
        textEn: "Only playground behaviour",
        isCorrect: false,
      },
      {
        textFr: "Elle ne concerne que les élèves en difficulté",
        textEn: "It only concerns struggling students",
        isCorrect: false,
      },
    ],
  },
  {
    order: 14,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: NOTES_LINK,
    textFr:
      'Enregistrez une décision "Départ" pour un élève : le formulaire vous demande-t-il tout de même une classe de destination ?',
    textEn:
      'Save a "Left" decision for a student: does the form still ask for a destination class?',
    hintFr:
      "Un élève qui part ne rejoint aucune classe de l'école l'an prochain.",
    hintEn:
      "A student who leaves doesn't join any class at the school next year.",
    explanationFr:
      "Faux : seule la décision Départ ne nécessite pas de classe de destination.",
    explanationEn:
      "False: only the Left decision does not require a destination class.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 15,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: NOTES_LINK,
    textFr:
      "Pourquoi la décision de passage est-elle réservée au seul professeur référent, plutôt qu'ouverte à tous les enseignants de la classe ?",
    textEn:
      "Why is the promotion decision reserved to the référent teacher alone, rather than open to every teacher of the class?",
    hintFr:
      "Il faut une vision d'ensemble et une seule décision cohérente par élève.",
    hintEn:
      "It needs an overall view and a single coherent decision per student.",
    explanationFr:
      "Parce qu'elle nécessite une vision globale de l'élève sur toutes les matières, et qu'une décision unique et cohérente doit être prise pour chaque élève.",
    explanationEn:
      "Because it requires an overall view of the student across all subjects, and a single, coherent decision must be made per student.",
    options: [
      {
        textFr:
          "Elle nécessite une vision globale et une décision unique cohérente",
        textEn: "It needs an overall view and a single coherent decision",
        isCorrect: true,
      },
      {
        textFr: "C'est une contrainte technique sans raison pédagogique",
        textEn: "It's a technical limitation with no pedagogical reason",
        isCorrect: false,
      },
      {
        textFr: "Les autres enseignants n'ont pas le droit de voir les notes",
        textEn: "Other teachers aren't allowed to see grades",
        isCorrect: false,
      },
      {
        textFr: "C'est réservé à l'administration en réalité",
        textEn: "It's actually reserved to the administration",
        isCorrect: false,
      },
    ],
  },
  {
    order: 16,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: SANTE_LINK,
    textFr:
      "L'accès en lecture seule du référent au module Santé lui permet de mieux adapter son suivi pédagogique et disciplinaire à la situation de l'élève, sans pouvoir modifier son dossier médical.",
    textEn:
      "The référent's read-only access to the Health module lets them better adapt their educational and disciplinary follow-up to the student's situation, without being able to edit their medical file.",
    hintFr:
      "L'accès est utile pour comprendre, pas pour gérer le dossier médical.",
    hintEn: "The access helps understanding, not managing the medical file.",
    explanationFr:
      "Vrai : c'est un accès d'information pour le suivi de l'élève, la gestion du dossier restant du ressort du personnel de santé.",
    explanationEn:
      "True: it's an informational access to follow the student, while managing the file stays the health staff's responsibility.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 17,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: NOTES_LINK,
    textFr:
      'Un élève est en "Redoublement" avec pour classe de destination la même classe que cette année : que cela signifie-t-il concrètement pour l\'an prochain ?',
    textEn:
      'A student\'s decision is "Repeated" with the same class as this year set as destination: what does that concretely mean for next year?',
    hintFr: "Redoublement veut dire refaire l'année, pas changer de niveau.",
    hintEn: "Repeating means doing the year over, not moving up a level.",
    explanationFr:
      "L'élève refait la même année scolaire dans le même niveau de classe, plutôt que de passer au niveau supérieur.",
    explanationEn:
      "The student repeats the same school year at the same class level, instead of moving up.",
    options: [
      {
        textFr: "Il refait la même année, au même niveau",
        textEn: "They repeat the same year, at the same level",
        isCorrect: true,
      },
      {
        textFr: "Il quitte définitivement l'établissement",
        textEn: "They permanently leave the school",
        isCorrect: false,
      },
      {
        textFr: "Il saute une classe",
        textEn: "They skip a grade",
        isCorrect: false,
      },
      {
        textFr: "Sa décision est annulée automatiquement",
        textEn: "Their decision is automatically cancelled",
        isCorrect: false,
      },
    ],
  },
  {
    order: 18,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: NOTES_LINK,
    textFr:
      "Une fois la décision de passage enregistrée pour un élève, les parents peuvent la voir dans leur propre espace pour préparer la réinscription.",
    textEn:
      "Once a student's promotion decision is saved, their parents can see it in their own space to prepare re-enrolment.",
    hintFr:
      "C'est ce qui déclenche la suite du parcours administratif côté famille.",
    hintEn:
      "This is what triggers the next administrative step on the family's side.",
    explanationFr:
      "Vrai : la décision du conseil de classe est ce qui débloque, côté parent, la réinscription pour l'année suivante.",
    explanationEn:
      "True: the class council's decision is what unlocks re-enrolment for next year on the parent's side.",
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
