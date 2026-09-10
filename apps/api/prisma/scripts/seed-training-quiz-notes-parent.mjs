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
  {
    order: 11,
    type: "TRUE_FALSE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Vous pouvez consulter les notes de votre enfant à tout moment depuis l'application.",
    textEn: "You can check your child's grades at any time from the app.",
    hintFr: "Il suffit d'ouvrir la fiche de l'enfant.",
    hintEn: "Just open the child's profile.",
    explanationFr:
      "Les notes sont consultables à tout moment depuis la fiche de l'enfant, dès qu'elles sont saisies par l'enseignant.",
    explanationEn:
      "Grades are viewable at any time from the child's profile, as soon as the teacher enters them.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 12,
    type: "MCQ_SINGLE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr: 'Que retrouve-t-on dans l\'onglet "Evaluations" ?',
    textEn: 'What do you find in the "Evaluations" tab?',
    hintFr: "C'est le premier onglet du module Notes.",
    hintEn: "It's the first tab of the Grades module.",
    explanationFr:
      "La liste de toutes les évaluations de l'enfant, avec la note obtenue à chacune.",
    explanationEn:
      "The list of every evaluation the child took, with the grade obtained on each.",
    options: [
      {
        textFr: "La liste de toutes les évaluations de l'enfant",
        textEn: "The list of every evaluation the child took",
        isCorrect: true,
      },
      {
        textFr: "Uniquement l'emploi du temps",
        textEn: "Only the timetable",
        isCorrect: false,
      },
      {
        textFr: "La liste des absences",
        textEn: "The list of absences",
        isCorrect: false,
      },
      {
        textFr: "Les messages de l'enseignant",
        textEn: "The teacher's messages",
        isCorrect: false,
      },
    ],
  },
  {
    order: 13,
    type: "TRUE_FALSE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr: "Chaque évaluation affiche la note obtenue par votre enfant.",
    textEn: "Every evaluation shows the grade your child obtained.",
    hintFr: "C'est l'information principale de chaque ligne.",
    hintEn: "It's the main piece of information on each row.",
    explanationFr:
      "La note obtenue est l'information centrale affichée pour chaque évaluation.",
    explanationEn:
      "The grade obtained is the central piece of information shown for each evaluation.",
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
    deepLinkRoute: "/children/{childId}/notes",
    textFr: "Où voir en un coup d'œil la moyenne générale de votre enfant ?",
    textEn: "Where do you see your child's overall average at a glance?",
    hintFr: "Un onglet porte exactement ce nom.",
    hintEn: "A tab is named exactly that.",
    explanationFr:
      'Dans l\'onglet "Moyennes", qui centralise toutes les moyennes par matière.',
    explanationEn:
      'In the "Averages" tab, which centralises every subject\'s average.',
    options: [
      {
        textFr: "Dans l'onglet Moyennes",
        textEn: "In the Averages tab",
        isCorrect: true,
      },
      {
        textFr: "Dans l'onglet Evaluations",
        textEn: "In the Evaluations tab",
        isCorrect: false,
      },
      {
        textFr: "Dans la messagerie",
        textEn: "In messaging",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas disponible",
        textEn: "It isn't available",
        isCorrect: false,
      },
    ],
  },
  {
    order: 15,
    type: "TRUE_FALSE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "L'onglet Graphiques affiche l'évolution des notes matière par matière.",
    textEn: "The Charts tab shows grade trends subject by subject.",
    hintFr:
      "C'est une vue visuelle, complémentaire au tableau des évaluations.",
    hintEn: "It's a visual view, complementary to the evaluations table.",
    explanationFr:
      "L'onglet Graphiques trace l'évolution des notes de l'élève, matière par matière.",
    explanationEn:
      "The Charts tab plots the student's grade trends, subject by subject.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 16,
    type: "MCQ_SINGLE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "À qui appartient la responsabilité de saisir les notes dans l'application ?",
    textEn: "Whose responsibility is it to enter grades in the app?",
    hintFr: "Ce sont les mêmes personnes qui font passer les évaluations.",
    hintEn: "It's the same people who give the evaluations.",
    explanationFr:
      "Aux enseignants, qui saisissent les notes de leurs évaluations.",
    explanationEn: "To teachers, who enter the grades for their evaluations.",
    options: [
      { textFr: "Aux enseignants", textEn: "To teachers", isCorrect: true },
      { textFr: "Aux parents", textEn: "To parents", isCorrect: false },
      {
        textFr: "À l'élève lui-même",
        textEn: "To the student themselves",
        isCorrect: false,
      },
      {
        textFr: "À un algorithme automatique",
        textEn: "To an automatic algorithm",
        isCorrect: false,
      },
    ],
  },
  {
    order: 17,
    type: "TRUE_FALSE",
    difficulty: "EASY",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Vous pouvez modifier une note affichée si vous pensez qu'elle est fausse.",
    textEn: "You can edit a displayed grade if you think it's wrong.",
    hintFr: "Le parent consulte, il ne modifie pas les notes.",
    hintEn: "Parents view grades, they don't edit them.",
    explanationFr:
      "Non, seul l'enseignant peut corriger une note. Le parent doit le contacter via la messagerie.",
    explanationEn:
      "No, only the teacher can correct a grade. The parent should contact them through messaging.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 18,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/messagerie",
    textFr: "Que faire si vous pensez qu'une note affichée est incorrecte ?",
    textEn: "What should you do if you think a displayed grade is incorrect?",
    hintFr:
      "Le canal direct avec l'enseignant est ailleurs dans l'application.",
    hintEn: "The direct channel to the teacher is elsewhere in the app.",
    explanationFr:
      "Contacter l'enseignant via la messagerie pour vérifier : le parent ne peut pas corriger une note lui-même.",
    explanationEn:
      "Contact the teacher through messaging to check: a parent can't correct a grade themselves.",
    options: [
      {
        textFr: "Contacter l'enseignant via la messagerie pour vérifier",
        textEn: "Contact the teacher through messaging to check",
        isCorrect: true,
      },
      {
        textFr: "La corriger vous-même dans l'application",
        textEn: "Correct it yourself in the app",
        isCorrect: false,
      },
      {
        textFr: "Ignorer, ce n'est pas grave",
        textEn: "Ignore it, it's not a big deal",
        isCorrect: false,
      },
      {
        textFr: "Attendre le prochain conseil de classe",
        textEn: "Wait for the next class council",
        isCorrect: false,
      },
    ],
  },
  {
    order: 19,
    type: "TRUE_FALSE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "La moyenne de classe affichée sur une évaluation permet de situer le niveau de votre enfant sans connaître les notes individuelles des autres élèves.",
    textEn:
      "The class average shown on an evaluation lets you place your child's level without seeing other students' individual grades.",
    hintFr:
      "L'application ne révèle jamais le détail des notes des autres élèves.",
    hintEn: "The app never reveals other students' individual grades.",
    explanationFr:
      "Vrai : seuls des chiffres agrégés (moyenne, min, max) sont montrés, jamais les notes individuelles des autres élèves.",
    explanationEn:
      "True: only aggregate figures (average, min, max) are shown, never other students' individual grades.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 20,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Pourquoi une note formative n'apparaît-elle pas dans le calcul de la moyenne de séquence ?",
    textEn:
      "Why doesn't a formative grade appear in the sequence average calculation?",
    hintFr: "Repensez à son rôle : informer, pas évaluer officiellement.",
    hintEn: "Think about its role: to inform, not to officially grade.",
    explanationFr:
      "Parce qu'elle sert uniquement d'indicateur de progression, pas d'évaluation notée qui compte officiellement.",
    explanationEn:
      "Because it's only a progress indicator, not an officially graded evaluation.",
    options: [
      {
        textFr: "Parce qu'elle sert uniquement d'indicateur de progression",
        textEn: "Because it's only a progress indicator",
        isCorrect: true,
      },
      {
        textFr: "Parce que c'est une erreur de l'application",
        textEn: "Because it's an app bug",
        isCorrect: false,
      },
      {
        textFr: "Parce qu'elle est toujours supérieure à la moyenne",
        textEn: "Because it's always above average",
        isCorrect: false,
      },
      {
        textFr: "Parce que seuls les parents la voient",
        textEn: "Because only parents can see it",
        isCorrect: false,
      },
    ],
  },
  {
    order: 21,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Quel onglet permet de comparer les moyennes de plusieurs matières entre elles ?",
    textEn:
      "Which tab lets you compare the averages of several subjects with each other?",
    hintFr: "Il liste toutes les matières côte à côte.",
    hintEn: "It lists every subject side by side.",
    explanationFr:
      "L'onglet Moyennes liste toutes les matières avec leur moyenne, ce qui permet de les comparer directement.",
    explanationEn:
      "The Averages tab lists every subject with its average, letting you compare them directly.",
    options: [
      { textFr: "Moyennes", textEn: "Averages", isCorrect: true },
      { textFr: "Evaluations", textEn: "Evaluations", isCorrect: false },
      {
        textFr: "Graphiques uniquement",
        textEn: "Charts only",
        isCorrect: false,
      },
      {
        textFr: "Aucun, il faut les additionner soi-même",
        textEn: "None, you have to add them up yourself",
        isCorrect: false,
      },
    ],
  },
  {
    order: 22,
    type: "TRUE_FALSE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Les notes formatives restent visibles dans l'onglet Evaluations même si elles ne comptent pas dans la moyenne.",
    textEn:
      "Formative grades stay visible in the Evaluations tab even though they don't count toward the average.",
    hintFr: "Elles sont marquées d'un badge distinct, pas masquées.",
    hintEn: "They're marked with a distinct badge, not hidden.",
    explanationFr:
      'Vrai : elles restent affichées avec un badge "formative", elles sont juste exclues du calcul.',
    explanationEn:
      'True: they stay displayed with a "formative" badge, they\'re just excluded from the calculation.',
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
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Sur quelle période porte la moyenne affichée dans l'onglet Moyennes ?",
    textEn: "What period does the average shown in the Averages tab cover?",
    hintFr: "Elle se recalcule à chaque nouvelle période.",
    hintEn: "It's recalculated at each new period.",
    explanationFr:
      "La séquence ou période en cours, pas l'ensemble de la scolarité.",
    explanationEn:
      "The current sequence or period, not the child's whole schooling.",
    options: [
      {
        textFr: "La séquence ou période en cours",
        textEn: "The current sequence or period",
        isCorrect: true,
      },
      {
        textFr: "Toute la scolarité de l'enfant",
        textEn: "The child's whole schooling",
        isCorrect: false,
      },
      {
        textFr: "La semaine en cours",
        textEn: "The current week",
        isCorrect: false,
      },
      {
        textFr: "Elle n'est jamais précisée",
        textEn: "It's never specified",
        isCorrect: false,
      },
    ],
  },
  {
    order: 24,
    type: "TRUE_FALSE",
    difficulty: "MEDIUM",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Un enseignant peut ajouter un commentaire à une évaluation, visible par le parent.",
    textEn:
      "A teacher can add a comment to an evaluation, visible to the parent.",
    hintFr:
      "La fiche détaillée d'une évaluation ne contient pas que des chiffres.",
    hintEn: "An evaluation's detail card isn't only numbers.",
    explanationFr:
      "Vrai : un commentaire de l'enseignant peut accompagner l'évaluation, visible sur sa fiche détaillée.",
    explanationEn:
      "True: a teacher's comment can accompany the evaluation, visible on its detail card.",
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
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Comment interpréter un écart négatif affiché à côté de la note de votre enfant ?",
    textEn:
      "How should you interpret a negative delta shown next to your child's grade?",
    hintFr:
      "L'écart se calcule toujours par rapport à la moyenne de la classe.",
    hintEn: "The delta is always computed against the class average.",
    explanationFr:
      "Sa note est en dessous de la moyenne de la classe sur cette évaluation précise.",
    explanationEn:
      "Their grade is below the class average on that specific evaluation.",
    options: [
      {
        textFr:
          "Sa note est en dessous de la moyenne de la classe sur cette évaluation",
        textEn: "Their grade is below the class average on this evaluation",
        isCorrect: true,
      },
      {
        textFr: "Il y a une erreur de saisie",
        textEn: "There's a data entry mistake",
        isCorrect: false,
      },
      {
        textFr: "La note va être recalculée automatiquement",
        textEn: "The grade will be recalculated automatically",
        isCorrect: false,
      },
      {
        textFr: "Cela concerne une autre matière",
        textEn: "It relates to a different subject",
        isCorrect: false,
      },
    ],
  },
  {
    order: 26,
    type: "MCQ_MULTI",
    difficulty: "HARD",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Quels éléments influencent la moyenne d'une matière affichée dans l'onglet Moyennes ? (plusieurs réponses)",
    textEn:
      "Which elements influence a subject's average shown in the Averages tab? (select all that apply)",
    hintFr:
      "Repensez à ce qui compte réellement, et à ce qui n'est qu'indicatif.",
    hintEn: "Think about what actually counts, and what's only indicative.",
    explanationFr:
      "Les notes non-formatives et leur coefficient influencent la moyenne — jamais les notes formatives ni vos échanges avec l'enseignant.",
    explanationEn:
      "Non-formative grades and their coefficient influence the average — never formative grades or your exchanges with the teacher.",
    options: [
      {
        textFr: "Les notes non-formatives de la période",
        textEn: "The period's non-formative grades",
        isCorrect: true,
      },
      {
        textFr: "Le coefficient de chaque évaluation",
        textEn: "Each evaluation's coefficient",
        isCorrect: true,
      },
      {
        textFr: "Les notes formatives",
        textEn: "Formative grades",
        isCorrect: false,
      },
      {
        textFr: "Le nombre de messages échangés avec l'enseignant",
        textEn: "The number of messages exchanged with the teacher",
        isCorrect: false,
      },
    ],
  },
  {
    order: 27,
    type: "TRUE_FALSE",
    difficulty: "HARD",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "La carte \"Point de vigilance\" peut changer de matière d'une période à l'autre.",
    textEn:
      'The "Subject to watch" card can change subject from one period to the next.',
    hintFr: "Elle se recalcule à partir des moyennes de la période en cours.",
    hintEn: "It's recalculated from the current period's averages.",
    explanationFr:
      "Vrai : elle reflète la matière la plus faible de la période en cours, qui peut varier au fil de l'année.",
    explanationEn:
      "True: it reflects the weakest subject of the current period, which can vary through the year.",
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
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Pourquoi le module propose-t-il à la fois des notes détaillées et des graphiques plutôt qu'une seule liste ?",
    textEn:
      "Why does the module offer both detailed grades and charts rather than a single list?",
    hintFr: "Chaque vue répond à un besoin différent.",
    hintEn: "Each view answers a different need.",
    explanationFr:
      "Pour repérer aussi bien le détail d'une évaluation précise que la tendance globale dans le temps.",
    explanationEn:
      "To spot both the detail of a specific evaluation and the overall trend over time.",
    options: [
      {
        textFr:
          "Pour repérer aussi bien le détail que la tendance globale dans le temps",
        textEn: "To see both the detail and the overall trend over time",
        isCorrect: true,
      },
      {
        textFr: "C'est purement décoratif",
        textEn: "It's purely decorative",
        isCorrect: false,
      },
      {
        textFr: "Les graphiques remplacent les notes détaillées",
        textEn: "Charts replace detailed grades",
        isCorrect: false,
      },
      {
        textFr: "Pour ralentir le chargement de la page",
        textEn: "To slow down the page loading",
        isCorrect: false,
      },
    ],
  },
  {
    order: 29,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      "Si votre enfant n'a aucune évaluation notée sur une matière, que se passe-t-il dans l'onglet Moyennes ?",
    textEn:
      "If your child has no graded evaluation in a subject, what happens in the Averages tab?",
    hintFr: "Sans note, il n'y a rien à calculer.",
    hintEn: "With no grade, there's nothing to compute.",
    explanationFr:
      "Aucune moyenne n'est calculée pour cette matière tant qu'il n'y a pas de note.",
    explanationEn:
      "No average is computed for that subject until there is a grade.",
    options: [
      {
        textFr: "Aucune moyenne n'est calculée tant qu'il n'y a pas de note",
        textEn: "No average is computed until there is a grade",
        isCorrect: true,
      },
      {
        textFr: "Une moyenne de 10/20 par défaut s'affiche",
        textEn: "A default 10/20 average is shown",
        isCorrect: false,
      },
      {
        textFr: "La matière disparaît complètement de l'application",
        textEn: "The subject disappears from the app entirely",
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
    order: 30,
    type: "TRUE_FALSE",
    difficulty: "HARD",
    image: null,
    deepLinkRoute: "/children/{childId}/notes",
    textFr:
      'Comparer la carte "Matière forte" et la carte "Point de vigilance" aide à cibler où concentrer le soutien scolaire.',
    textEn:
      'Comparing the "Strong subject" and "Subject to watch" cards helps target where to focus academic support.',
    hintFr: "Ce sont deux repères complémentaires, pas juste décoratifs.",
    hintEn: "They are two complementary landmarks, not just decorative.",
    explanationFr:
      "Vrai : ces deux cartes donnent en un coup d'œil les points forts et les points à travailler.",
    explanationEn:
      "True: these two cards give an at-a-glance view of strengths and areas to work on.",
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
