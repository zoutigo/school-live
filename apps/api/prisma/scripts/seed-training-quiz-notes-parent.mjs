import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const IMG = (name) => `/training-quiz/notes/${name}.svg`;

const CHAPTER = {
  role: "PARENT",
  moduleKey: "notes",
  order: 3,
  icon: "BookOpen",
  colorFrom: "#3EAE7A",
  colorTo: "#237A54",
  titleFr: "Notes & Évaluations",
  titleEn: "Grades & Evaluations",
  descriptionFr:
    "Découvrez comment suivre les notes, moyennes et évaluations de votre enfant.",
  descriptionEn:
    "Discover how to follow your child's grades, averages and evaluations.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    difficulty: "EASY",
    image: IMG("q1-onglet-evaluations"),
    deepLinkRoute: "/children/{childId}/notes",
    textFr: "Où consulter les notes de votre enfant dans l'application ?",
    textEn: "Where do you check your child's grades in the app?",
    hintFr:
      "Ouvrez la fiche de votre enfant, puis regardez les onglets en haut.",
    hintEn: "Open your child's profile, then look at the tabs at the top.",
    explanationFr:
      'Ouvrez la fiche de votre enfant puis l\'onglet "Evaluations" pour retrouver toutes ses notes.',
    explanationEn:
      'Open your child\'s profile, then the "Evaluations" tab to find all their grades.',
    options: [
      {
        textFr: "Dans l'onglet \"Evaluations\" de la fiche de l'enfant",
        textEn: 'In the "Evaluations" tab of the child\'s profile',
        isCorrect: true,
      },
      {
        textFr: "Dans la messagerie",
        textEn: "In messaging",
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
    image: IMG("q2-onglet-moyennes"),
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      'L\'onglet "Moyennes" affiche la moyenne de votre enfant par matière.',
    textEn: 'The "Averages" tab shows your child\'s average per subject.',
    hintFr: 'Regardez les onglets disponibles à côté d\'"Evaluations".',
    hintEn: 'Look at the tabs available next to "Evaluations".',
    explanationFr:
      "L'onglet \"Moyennes\" liste chaque matière avec la moyenne de l'élève et celle de la classe.",
    explanationEn:
      'The "Averages" tab lists every subject with the student\'s average and the class average.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 3,
    type: "MCQ_SINGLE",
    difficulty: "EASY",
    image: IMG("q3-onglet-graphiques"),
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Quel onglet permet de visualiser l'évolution des notes sous forme de graphique ?",
    textEn: "Which tab lets you view grade trends as a chart?",
    hintFr: "Son nom l'indique directement.",
    hintEn: "Its name says it directly.",
    explanationFr:
      "L'onglet \"Graphiques\" affiche l'évolution des notes de l'élève sous forme visuelle.",
    explanationEn:
      'The "Charts" tab displays the student\'s grade trends visually.',
    options: [
      { textFr: "Graphiques", textEn: "Charts", isCorrect: true },
      { textFr: "Evaluations", textEn: "Evaluations", isCorrect: false },
      { textFr: "Moyennes", textEn: "Averages", isCorrect: false },
      { textFr: "Documents", textEn: "Documents", isCorrect: false },
    ],
  },
  {
    order: 4,
    type: "MCQ_MULTI",
    difficulty: "MEDIUM",
    image: IMG("q4-detail-evaluation"),
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Sur la fiche détaillée d'une évaluation, quelles informations de comparaison avec la classe sont affichées ? (plusieurs réponses)",
    textEn:
      "On an evaluation's detail card, which comparison figures with the class are shown? (select all that apply)",
    hintFr:
      'Ouvrez une évaluation dans l\'onglet "Evaluations" pour voir son détail.',
    hintEn: 'Open an evaluation in the "Evaluations" tab to see its detail.',
    explanationFr:
      "La fiche affiche la moyenne, la note minimale et la note maximale de la classe — jamais le nom des autres élèves.",
    explanationEn:
      "The card shows the class average, minimum and maximum grade — never other students' names.",
    options: [
      {
        textFr: "La moyenne de la classe",
        textEn: "The class average",
        isCorrect: true,
      },
      {
        textFr: "La note minimale de la classe",
        textEn: "The class minimum grade",
        isCorrect: true,
      },
      {
        textFr: "La note maximale de la classe",
        textEn: "The class maximum grade",
        isCorrect: true,
      },
      {
        textFr: "Le nom des autres élèves et leurs notes",
        textEn: "Other students' names and grades",
        isCorrect: false,
      },
    ],
  },
  {
    order: 5,
    type: "TRUE_FALSE",
    difficulty: "MEDIUM",
    image: IMG("q5-note-formative"),
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      'Une note marquée "formative" compte dans le calcul de la moyenne de la séquence.',
    textEn:
      'A grade marked "formative" counts in the sequence average calculation.',
    hintFr: "Une évaluation formative est affichée à titre indicatif.",
    hintEn: "A formative evaluation is shown for reference only.",
    explanationFr:
      "Une note formative est affichée à titre indicatif et ne compte pas dans la moyenne de séquence : seul l'examen final compte.",
    explanationEn:
      "A formative grade is shown for reference only and does not count toward the sequence average: only the final exam counts.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 6,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: IMG("q6-badge-formative"),
    deepLinkRoute: "/children/{childId}/notes",
    textFr: 'Que signifie un badge "formative" affiché sur une évaluation ?',
    textEn: 'What does a "formative" badge on an evaluation mean?',
    hintFr:
      "Ce badge prévient que cette note n'a pas le même poids qu'un examen final.",
    hintEn:
      "This badge warns that this grade doesn't carry the same weight as a final exam.",
    explanationFr:
      'Le badge "formative" indique une note affichée pour information, qui n\'entre pas dans le calcul de la moyenne.',
    explanationEn:
      'The "formative" badge marks a grade shown for information only, excluded from the average calculation.',
    options: [
      {
        textFr: "Une note affichée à titre indicatif, exclue de la moyenne",
        textEn: "A grade shown for reference only, excluded from the average",
        isCorrect: true,
      },
      {
        textFr: "Une note plus importante que les autres",
        textEn: "A grade more important than the others",
        isCorrect: false,
      },
      {
        textFr: "Une erreur de saisie de l'enseignant",
        textEn: "A teacher's input mistake",
        isCorrect: false,
      },
      {
        textFr: "Une note obligatoirement supérieure à 10",
        textEn: "A grade that must be above 10",
        isCorrect: false,
      },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: IMG("q7-point-vigilance"),
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Dans le bandeau du haut, comment repérer la matière où votre enfant a le plus besoin de soutien ?",
    textEn:
      "In the top banner, how do you spot the subject where your child needs the most support?",
    hintFr: "Cherchez une carte avec un intitulé qui parle de vigilance.",
    hintEn: "Look for a card whose label mentions being watchful.",
    explanationFr:
      'La carte "Point de vigilance" met en avant la matière où la moyenne de l\'élève est la plus faible.',
    explanationEn:
      'The "Subject to watch" card highlights the subject where the student\'s average is lowest.',
    options: [
      {
        textFr: 'La carte "Point de vigilance"',
        textEn: 'The "Subject to watch" card',
        isCorrect: true,
      },
      {
        textFr: 'La carte "Matière forte"',
        textEn: 'The "Strong subject" card',
        isCorrect: false,
      },
      {
        textFr: "L'onglet Graphiques uniquement",
        textEn: "The Charts tab only",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas indiqué",
        textEn: "This isn't shown",
        isCorrect: false,
      },
    ],
  },
  {
    order: 8,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: IMG("q8-matiere-forte"),
    deepLinkRoute: "/children/{childId}/notes",
    textFr: "Comment repérer la matière où votre enfant excelle le plus ?",
    textEn: "How do you spot the subject where your child excels the most?",
    hintFr: 'C\'est la carte opposée au "Point de vigilance".',
    hintEn: 'It\'s the card opposite the "Subject to watch".',
    explanationFr:
      'La carte "Matière forte" affiche la matière où la moyenne de l\'élève est la plus élevée.',
    explanationEn:
      'The "Strong subject" card shows the subject where the student\'s average is highest.',
    options: [
      {
        textFr: 'La carte "Matière forte"',
        textEn: 'The "Strong subject" card',
        isCorrect: true,
      },
      {
        textFr: 'La carte "Point de vigilance"',
        textEn: 'The "Subject to watch" card',
        isCorrect: false,
      },
      {
        textFr: "Il faut calculer soi-même toutes les moyennes",
        textEn: "You have to compute every average yourself",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est visible que par l'enseignant",
        textEn: "Only the teacher can see it",
        isCorrect: false,
      },
    ],
  },
  {
    order: 9,
    type: "TRUE_FALSE",
    difficulty: "HARD",
    image: IMG("q9-moyenne-non-formative"),
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "La moyenne affichée pour une matière prend uniquement en compte les évaluations non-formatives.",
    textEn:
      "The average shown for a subject only takes non-formative evaluations into account.",
    hintFr: 'Repensez à ce que signifie le badge "formative".',
    hintEn: 'Think back to what the "formative" badge means.',
    explanationFr:
      "Puisque les notes formatives sont exclues du calcul, la moyenne affichée ne reflète que les évaluations qui comptent réellement.",
    explanationEn:
      "Since formative grades are excluded from the calculation, the displayed average only reflects evaluations that actually count.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 10,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: IMG("q10-ecart-classe"),
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Si la note de votre enfant est supérieure à la moyenne de la classe sur une évaluation, comment cela apparaît-il ?",
    textEn:
      "If your child's grade is above the class average on an evaluation, how is that shown?",
    hintFr: "Regardez à côté de la moyenne élève sur la fiche de l'évaluation.",
    hintEn: "Look next to the student average on the evaluation card.",
    explanationFr:
      "Un écart (delta) en points par rapport à la moyenne de la classe est affiché à côté de la note de l'élève.",
    explanationEn:
      "A points delta compared with the class average is shown next to the student's grade.",
    options: [
      {
        textFr:
          "Un écart en points par rapport à la moyenne de la classe est affiché",
        textEn: "A points delta compared with the class average is shown",
        isCorrect: true,
      },
      {
        textFr: "Rien n'est affiché, il faut comparer soi-même",
        textEn: "Nothing is shown, you must compare it yourself",
        isCorrect: false,
      },
      {
        textFr: "Une alerte est envoyée à l'enseignant",
        textEn: "An alert is sent to the teacher",
        isCorrect: false,
      },
      {
        textFr: "La note est automatiquement arrondie à la hausse",
        textEn: "The grade is automatically rounded up",
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
