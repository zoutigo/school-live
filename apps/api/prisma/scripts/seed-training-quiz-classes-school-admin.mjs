import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/classes";

const CHAPTER = {
  role: "SCHOOL_ADMIN",
  moduleKey: "classes",
  order: 3,
  icon: "Building2",
  colorFrom: "#0D9488",
  colorTo: "#0F766E",
  titleFr: "Classes",
  titleEn: "Classes",
  descriptionFr:
    "Apprenez à créer des classes, assigner enseignants et référents, affecter des élèves et gérer leur couleur.",
  descriptionEn:
    "Learn how to create classes, assign teachers and referents, assign students, and manage their color.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quels onglets retrouvez-vous sur une fiche de classe ? (plusieurs réponses)",
    textEn: "Which tabs do you find on a class's page? (select all that apply)",
    hintFr: "Il y en a quatre, en plus de l'onglet d'aide.",
    hintEn: "There are four, on top of the help tab.",
    explanationFr: "Liste, Voir, Affectations, Élèves (et Aide).",
    explanationEn: "List, View, Assignments, Students (and Help).",
    options: [
      { textFr: "Liste", textEn: "List", isCorrect: true },
      { textFr: "Voir", textEn: "View", isCorrect: true },
      { textFr: "Affectations", textEn: "Assignments", isCorrect: true },
      { textFr: "Élèves", textEn: "Students", isCorrect: true },
    ],
  },
  {
    order: 2,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quelles informations renseignez-vous pour créer une nouvelle classe ? (plusieurs réponses)",
    textEn:
      "What information do you fill in to create a new class? (select all that apply)",
    hintFr: "Deux d'entre elles sont optionnelles (filière, capacité).",
    hintEn: "Two of them are optional (track, capacity).",
    explanationFr:
      "Nom, niveau, année scolaire, capacité (optionnelle) et curriculum/filière.",
    explanationEn:
      "Name, level, school year, capacity (optional) and curriculum/track.",
    options: [
      { textFr: "Nom de la classe", textEn: "Class name", isCorrect: true },
      { textFr: "Niveau", textEn: "Level", isCorrect: true },
      { textFr: "Année scolaire", textEn: "School year", isCorrect: true },
      {
        textFr: "Adresse postale de l'élève",
        textEn: "The student's postal address",
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
    textFr: "Une classe peut se voir attribuer une couleur personnalisée.",
    textEn: "A class can be assigned a custom color.",
    hintFr: "Un sélecteur de couleur dédié existe dans l'onglet Voir.",
    hintEn: "A dedicated color picker exists in the View tab.",
    explanationFr:
      "Vrai : un sélecteur de couleur permet de personnaliser chaque classe.",
    explanationEn: "True: a color picker lets you customize each class.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 4,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Dans l'onglet Affectations, quels rôles pouvez-vous assigner à une classe ?",
    textEn: "In the Assignments tab, which roles can you assign to a class?",
    hintFr: "L'un est unique par classe, l'autre se répète par matière.",
    hintEn: "One is unique per class, the other repeats per subject.",
    explanationFr:
      "Un enseignant référent (un par classe) et des enseignants par matière.",
    explanationEn:
      "A referent teacher (one per class) and teachers per subject.",
    options: [
      {
        textFr: "Enseignant référent et enseignants par matière",
        textEn: "Referent teacher and teachers per subject",
        isCorrect: true,
      },
      {
        textFr: "Uniquement le directeur d'école",
        textEn: "Only the school principal",
        isCorrect: false,
      },
      {
        textFr: "Uniquement les parents délégués",
        textEn: "Only parent representatives",
        isCorrect: false,
      },
      {
        textFr: "Aucun, cela se fait ailleurs",
        textEn: "None, this is done elsewhere",
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
      "Vous pouvez suivre le statut d'inscription de chaque élève depuis l'onglet Élèves de la classe.",
    textEn:
      "You can track each student's enrollment status from the class's Students tab.",
    hintFr: "Une colonne dédiée affiche ce statut par élève.",
    hintEn: "A dedicated column shows this status per student.",
    explanationFr:
      "Vrai : le statut d'inscription de chaque élève y est visible et modifiable.",
    explanationEn:
      "True: each student's enrollment status is visible and editable there.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 6,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Une classe peut être supprimée sans confirmation préalable.",
    textEn: "A class can be deleted without prior confirmation.",
    hintFr: "La suppression est une opération sensible et irréversible.",
    hintEn: "Deletion is a sensitive, irreversible operation.",
    explanationFr:
      "Faux : une confirmation explicite est demandée avant toute suppression.",
    explanationEn:
      "False: an explicit confirmation is required before deleting.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quel filtre permet de retrouver rapidement une classe précise dans la liste ?",
    textEn: "Which filter helps you quickly find a specific class in the list?",
    hintFr: "Un champ dédié existe en plus du filtre par niveau.",
    hintEn: "A dedicated field exists in addition to the level filter.",
    explanationFr: "Un champ de recherche par nom de classe.",
    explanationEn: "A search field by class name.",
    options: [
      {
        textFr: "Recherche par nom de classe",
        textEn: "Search by class name",
        isCorrect: true,
      },
      {
        textFr: "Recherche par matricule enseignant",
        textEn: "Search by teacher ID number",
        isCorrect: false,
      },
      {
        textFr: "Recherche par numéro de salle",
        textEn: "Search by room number",
        isCorrect: false,
      },
      {
        textFr: "Aucun filtre disponible",
        textEn: "No filter available",
        isCorrect: false,
      },
    ],
  },
  {
    order: 8,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Dans le détail d'une classe, quelle information pédagogique est affichée par matière ?",
    textEn:
      "In a class's details, what teaching information is shown per subject?",
    hintFr: "Deux colonnes concernent l'organisation horaire de la matière.",
    hintEn: "Two columns concern the subject's weekly scheduling.",
    explanationFr:
      "Le coefficient et le nombre d'heures hebdomadaires de chaque matière.",
    explanationEn: "The coefficient and the weekly hour count of each subject.",
    options: [
      {
        textFr: "Le coefficient et les heures hebdomadaires",
        textEn: "The coefficient and weekly hours",
        isCorrect: true,
      },
      {
        textFr: "Le salaire de l'enseignant",
        textEn: "The teacher's salary",
        isCorrect: false,
      },
      {
        textFr: "Le prix des fournitures",
        textEn: "The price of supplies",
        isCorrect: false,
      },
      {
        textFr: "La distance domicile-école",
        textEn: "The home-to-school distance",
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
    textFr: "Une classe est toujours rattachée à une seule année scolaire.",
    textEn: "A class always belongs to a single school year.",
    hintFr: "C'est un champ obligatoire à la création.",
    hintEn: "It's a required field at creation.",
    explanationFr:
      "Vrai : l'année scolaire fait partie des informations obligatoires de la classe.",
    explanationEn:
      "True: the school year is part of the class's required information.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 10,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Ouvrez l'onglet Liste, créez une nouvelle classe sans renseigner de nom : que se passe-t-il ?",
    textEn:
      "Open the List tab, try creating a new class without a name: what happens?",
    hintFr: "Le nom est un champ strictement obligatoire.",
    hintEn: "The name is a strictly required field.",
    explanationFr:
      "La création est bloquée tant que le nom n'est pas renseigné.",
    explanationEn: "Creation is blocked until the name is filled in.",
    options: [
      {
        textFr: "La création est bloquée",
        textEn: "Creation is blocked",
        isCorrect: true,
      },
      {
        textFr: "Un nom générique est attribué automatiquement",
        textEn: "A generic name is assigned automatically",
        isCorrect: false,
      },
      {
        textFr: "La classe est créée sans nom visible",
        textEn: "The class is created with no visible name",
        isCorrect: false,
      },
      {
        textFr: "Un enseignant doit valider le nom",
        textEn: "A teacher must approve the name",
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
      "Dans l'onglet Voir, ouvrez le sélecteur de couleur d'une classe : que se passe-t-il si aucune couleur n'est disponible ?",
    textEn:
      "In the View tab, open a class's color picker: what happens if no color is available?",
    hintFr: "Un message dédié à cette situation existe dans le sélecteur.",
    hintEn: "A dedicated message for this situation exists in the picker.",
    explanationFr: "Un message indique qu'aucune couleur n'est disponible.",
    explanationEn: "A message indicates that no color is available.",
    options: [
      {
        textFr: 'Un message "aucune couleur" s\'affiche',
        textEn: 'A "no color" message is shown',
        isCorrect: true,
      },
      {
        textFr: "L'application plante",
        textEn: "The app crashes",
        isCorrect: false,
      },
      {
        textFr: "Une couleur est choisie au hasard",
        textEn: "A color is picked at random",
        isCorrect: false,
      },
      {
        textFr: "La classe est automatiquement supprimée",
        textEn: "The class is automatically deleted",
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
      "Assignez un enseignant référent à une classe qui en a déjà un : le nouveau remplace l'ancien.",
    textEn:
      "Assign a referent teacher to a class that already has one: the new one replaces the previous one.",
    hintFr: "Le référent est unique par classe.",
    hintEn: "The referent is unique per class.",
    explanationFr:
      "Vrai : une seule personne peut être référente d'une classe à la fois.",
    explanationEn: "True: only one person can be a class's referent at a time.",
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
      "Dans l'onglet Élèves, modifiez le statut d'inscription d'un élève : où ce changement est-il visible ensuite ?",
    textEn:
      "In the Students tab, change a student's enrollment status: where else does this change become visible?",
    hintFr: "Pensez au module dédié à la gestion des dossiers d'inscription.",
    hintEn: "Think of the module dedicated to managing enrollment records.",
    explanationFr: "Dans le module Inscriptions, où ce même statut est géré.",
    explanationEn:
      "In the Enrollments module, where that same status is managed.",
    options: [
      {
        textFr: "Dans le module Inscriptions",
        textEn: "In the Enrollments module",
        isCorrect: true,
      },
      {
        textFr: "Dans le module Discipline",
        textEn: "In the Discipline module",
        isCorrect: false,
      },
      {
        textFr: "Nulle part ailleurs",
        textEn: "Nowhere else",
        isCorrect: false,
      },
      {
        textFr: "Uniquement dans un export PDF",
        textEn: "Only in a PDF export",
        isCorrect: false,
      },
    ],
  },
  {
    order: 14,
    type: "MCQ_MULTI",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quels modules sont directement impactés par les affectations réalisées dans une fiche de classe ? (plusieurs réponses)",
    textEn:
      "Which modules are directly impacted by the assignments made on a class's page? (select all that apply)",
    hintFr:
      "Pensez à ce qui dépend du référent, des enseignants et des élèves affectés.",
    hintEn:
      "Think about what depends on the referent, the teachers and the assigned students.",
    explanationFr:
      "Notes (enseignants par matière), Discipline et Emploi du temps (référent/classe), et Inscriptions (élèves affectés).",
    explanationEn:
      "Grades (teachers per subject), Discipline and Timetable (referent/class), and Enrollments (assigned students).",
    options: [
      { textFr: "Notes", textEn: "Grades", isCorrect: true },
      { textFr: "Emploi du temps", textEn: "Timetable", isCorrect: true },
      { textFr: "Inscriptions", textEn: "Enrollments", isCorrect: true },
      {
        textFr: "Boutique en ligne",
        textEn: "Online shop",
        isCorrect: false,
      },
    ],
  },
  {
    order: 15,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Pourquoi vaut-il mieux définir le curriculum d'une classe dès sa création plutôt que plus tard ?",
    textEn:
      "Why is it better to set a class's curriculum right at creation rather than later?",
    hintFr: "Le curriculum conditionne les matières proposées dans la classe.",
    hintEn: "The curriculum drives which subjects are offered in the class.",
    explanationFr:
      "Parce que les matières et coefficients de la classe découlent du curriculum choisi : le fixer tôt évite de devoir réaffecter matières et enseignants ensuite.",
    explanationEn:
      "Because the class's subjects and coefficients derive from the chosen curriculum: setting it early avoids having to reassign subjects and teachers afterwards.",
    options: [
      {
        textFr:
          "Les matières et coefficients en découlent, éviter de tout réaffecter",
        textEn:
          "Subjects and coefficients derive from it, avoiding reassigning everything",
        isCorrect: true,
      },
      {
        textFr: "Le curriculum ne peut être choisi qu'une seule fois par école",
        textEn: "The curriculum can only be chosen once per school",
        isCorrect: false,
      },
      {
        textFr: "Cela change la couleur de la classe",
        textEn: "It changes the class's color",
        isCorrect: false,
      },
      {
        textFr: "Cela n'a aucun impact",
        textEn: "It has no impact",
        isCorrect: false,
      },
    ],
  },
  {
    order: 16,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Retirer un enseignant référent d'une classe efface aussi l'historique disciplinaire de ses élèves.",
    textEn:
      "Removing a class's referent teacher also erases its students' discipline history.",
    hintFr:
      "L'historique disciplinaire est rattaché à l'élève, pas au référent.",
    hintEn:
      "The discipline history is tied to the student, not to the referent.",
    explanationFr:
      "Faux : l'historique disciplinaire reste attaché à chaque élève, indépendamment du référent en poste.",
    explanationEn:
      "False: the discipline history stays attached to each student, independently of who the referent is.",
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
