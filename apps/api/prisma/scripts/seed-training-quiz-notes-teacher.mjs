import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/classes/{classId}/notes";

const CHAPTER = {
  role: "TEACHER",
  moduleKey: "notes",
  order: 1,
  icon: "BookOpen",
  colorFrom: "#0C5FA8",
  colorTo: "#08467D",
  titleFr: "Notes & Évaluations",
  titleEn: "Grades & Evaluations",
  descriptionFr:
    "Apprenez à créer vos évaluations, saisir les notes de votre classe et rédiger les appréciations du conseil de classe.",
  descriptionEn:
    "Learn how to create evaluations, enter grades for your class, and write class council appreciations.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Où créez-vous une nouvelle évaluation pour votre classe ?",
    textEn: "Where do you create a new evaluation for your class?",
    hintFr: "C'est le premier onglet du module Notes de votre classe.",
    hintEn: "It's the first tab of your class's Grades module.",
    explanationFr:
      "Dans l'onglet Évaluations de votre classe, en cliquant sur le bouton + pour renseigner titre, matière, type, séquence, date et barème.",
    explanationEn:
      "In your class's Evaluations tab, by clicking the + button to fill in title, subject, type, sequence, date and scale.",
    options: [
      {
        textFr: "Dans l'onglet Évaluations, avec le bouton +",
        textEn: "In the Evaluations tab, with the + button",
        isCorrect: true,
      },
      {
        textFr: "Dans la messagerie",
        textEn: "In messaging",
        isCorrect: false,
      },
      {
        textFr: "Dans l'onglet Décision",
        textEn: "In the Decision tab",
        isCorrect: false,
      },
      {
        textFr: "Il faut le demander à l'administration",
        textEn: "You must ask the administration",
        isCorrect: false,
      },
    ],
  },
  {
    order: 2,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Une évaluation enregistrée en brouillon est invisible pour les élèves et les parents, même si des notes y sont déjà saisies.",
    textEn:
      "An evaluation saved as a draft is invisible to students and parents, even if grades have already been entered.",
    hintFr: "Le badge Brouillon ou Publié sur la carte indique son état.",
    hintEn: "The Draft or Published badge on the card shows its state.",
    explanationFr:
      "Vrai : tant que l'évaluation reste en brouillon, ni elle ni ses notes n'apparaissent chez les familles. Il faut la publier pour la rendre visible.",
    explanationEn:
      "True: as long as the evaluation stays a draft, neither it nor its grades appear for families. You must publish it to make it visible.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 3,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Que montre le compteur affiché sur chaque carte d'évaluation dans la liste ?",
    textEn:
      "What does the counter shown on each evaluation card in the list indicate?",
    hintFr: "Il compare deux nombres liés à la saisie des notes.",
    hintEn: "It compares two numbers related to grade entry.",
    explanationFr:
      "Le nombre de notes déjà saisies sur l'effectif total de la classe, avec une couleur qui change selon que la saisie est complète ou non.",
    explanationEn:
      "The number of grades already entered out of the class's total headcount, with a colour that changes depending on whether entry is complete.",
    options: [
      {
        textFr: "Les notes saisies sur l'effectif de la classe",
        textEn: "Grades entered out of the class headcount",
        isCorrect: true,
      },
      {
        textFr: "La moyenne de la classe",
        textEn: "The class average",
        isCorrect: false,
      },
      {
        textFr: "Le nombre de messages reçus",
        textEn: "The number of messages received",
        isCorrect: false,
      },
      {
        textFr: "Le coefficient de l'évaluation",
        textEn: "The evaluation's coefficient",
        isCorrect: false,
      },
    ],
  },
  {
    order: 4,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Dans l'onglet Notes de votre classe, que voyez-vous après avoir recherché un élève ?",
    textEn:
      "In your class's Notes tab, what do you see after searching for a student?",
    hintFr: "C'est une vue de consultation, pas de saisie.",
    hintEn: "It's a viewing screen, not an entry screen.",
    explanationFr:
      "Toutes ses notes et sa moyenne, matière par matière — une vue de consultation individuelle.",
    explanationEn:
      "All their grades and average, subject by subject — an individual consultation view.",
    options: [
      {
        textFr: "Toutes ses notes et sa moyenne, matière par matière",
        textEn: "All their grades and average, subject by subject",
        isCorrect: true,
      },
      {
        textFr: "La liste de ses absences",
        textEn: "Their list of absences",
        isCorrect: false,
      },
      {
        textFr: "Son emploi du temps",
        textEn: "Their timetable",
        isCorrect: false,
      },
      {
        textFr: "Les messages échangés avec ses parents",
        textEn: "Messages exchanged with their parents",
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
      "Une fois un élève sélectionné dans l'onglet Notes, vous pouvez cliquer sur un trimestre pour afficher ses notes sur cette période précise.",
    textEn:
      "Once a student is selected in the Notes tab, you can click a term to display their grades for that specific period.",
    hintFr: "La sélection du trimestre recalcule la vue affichée.",
    hintEn: "Selecting the term recalculates the view shown.",
    explanationFr:
      "Vrai : la vue se recentre sur le trimestre choisi, avec les notes et la moyenne de cette période.",
    explanationEn:
      "True: the view refocuses on the chosen term, with the grades and average for that period.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 6,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Lors de la saisie des notes, quels statuts pouvez-vous attribuer à un élève ? (plusieurs réponses)",
    textEn:
      "When entering grades, which statuses can you assign to a student? (select all that apply)",
    hintFr: "Un des statuts sert justement à ne pas noter l'élève.",
    hintEn: "One of the statuses is precisely there to not grade the student.",
    explanationFr:
      "Note saisie, Absent, Excusé ou Non noté — quatre statuts possibles pour chaque élève.",
    explanationEn:
      "Grade entered, Absent, Excused or Not graded — four possible statuses for each student.",
    options: [
      { textFr: "Note saisie", textEn: "Grade entered", isCorrect: true },
      { textFr: "Absent", textEn: "Absent", isCorrect: true },
      { textFr: "Excusé", textEn: "Excused", isCorrect: true },
      { textFr: "Non noté", textEn: "Not graded", isCorrect: true },
    ],
  },
  {
    order: 7,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Le champ note ne s'active que lorsque le statut de l'élève est \"Note saisie\".",
    textEn:
      'The grade field only becomes active when the student\'s status is "Grade entered".',
    hintFr:
      "Cela évite d'enregistrer une note incohérente avec l'absence de l'élève.",
    hintEn:
      "This avoids recording a grade that contradicts the student's absence.",
    explanationFr:
      "Vrai : pour Absent, Excusé ou Non noté, le champ note reste désactivé.",
    explanationEn:
      "True: for Absent, Excused or Not graded, the grade field stays disabled.",
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
    textFr:
      "En plus de la note elle-même, que pouvez-vous saisir pour un élève noté ?",
    textEn:
      "Besides the grade itself, what else can you enter for a graded student?",
    hintFr: "Il est visible avec sa note, propre à cet élève.",
    hintEn: "It is visible with their grade, specific to that student.",
    explanationFr: "Un commentaire individuel, visible avec sa note.",
    explanationEn: "An individual comment, visible alongside their grade.",
    options: [
      {
        textFr: "Un commentaire individuel",
        textEn: "An individual comment",
        isCorrect: true,
      },
      {
        textFr: "Une pièce jointe obligatoire",
        textEn: "A mandatory attachment",
        isCorrect: false,
      },
      {
        textFr: "Une deuxième note de rattrapage",
        textEn: "A second make-up grade",
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
    order: 9,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Dans l'onglet Conseil de classe, que rédigez-vous pour chaque matière que vous enseignez ?",
    textEn:
      "In the Class Council tab, what do you write for each subject you teach?",
    hintFr: "Ce texte apparaîtra sur le bulletin de l'élève.",
    hintEn: "This text will appear on the student's report card.",
    explanationFr:
      "Une appréciation qui apparaîtra sur le bulletin de l'élève pour cette matière.",
    explanationEn:
      "An appreciation that will appear on the student's report card for that subject.",
    options: [
      {
        textFr: "Une appréciation par matière",
        textEn: "A per-subject appreciation",
        isCorrect: true,
      },
      {
        textFr: "Une nouvelle note chiffrée",
        textEn: "A new numeric grade",
        isCorrect: false,
      },
      {
        textFr: "Un message privé à l'administration",
        textEn: "A private message to the administration",
        isCorrect: false,
      },
      {
        textFr: "Rien, cet onglet est en lecture seule",
        textEn: "Nothing, this tab is read-only",
        isCorrect: false,
      },
    ],
  },
  {
    order: 10,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Tout enseignant de la classe peut rédiger l'appréciation générale de conseil de classe, pas seulement le professeur référent.",
    textEn:
      "Any teacher of the class can write the general class council appreciation, not only the référent teacher.",
    hintFr:
      "Cette appréciation résume l'avis du conseil sur l'ensemble du trimestre, au-delà d'une seule matière.",
    hintEn:
      "This appreciation summarizes the council's view on the whole term, beyond a single subject.",
    explanationFr:
      "Faux : seul le professeur référent de la classe peut rédiger l'appréciation générale, en plus des appréciations par matière.",
    explanationEn:
      "False: only the class's référent teacher can write the general appreciation, in addition to the per-subject appreciations.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 11,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Vous pouvez enregistrer les appréciations du conseil de classe en brouillon avant de les publier.",
    textEn:
      "You can save class council appreciations as a draft before publishing them.",
    hintFr: "Même logique que pour une évaluation.",
    hintEn: "Same logic as for an evaluation.",
    explanationFr:
      "Vrai : Brouillon les prépare sans les rendre visibles aux familles, Publié les rend consultables sur le bulletin.",
    explanationEn:
      "True: Draft prepares them without making them visible to families, Published makes them viewable on the report card.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 13,
    type: "MCQ_MULTI",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Ouvrez l'onglet Évaluations et créez une nouvelle évaluation : quelles informations devez-vous renseigner ? (plusieurs réponses)",
    textEn:
      "Open the Evaluations tab and create a new evaluation: which information must you fill in? (select all that apply)",
    hintFr: "Le bouton + ouvre un formulaire complet.",
    hintEn: "The + button opens a full form.",
    explanationFr:
      "Titre, matière, type, séquence, date, barème et coefficient — tout ce qui définit l'évaluation.",
    explanationEn:
      "Title, subject, type, sequence, date, scale and coefficient — everything that defines the evaluation.",
    options: [
      { textFr: "Le titre", textEn: "The title", isCorrect: true },
      {
        textFr: "La matière et le type",
        textEn: "The subject and type",
        isCorrect: true,
      },
      {
        textFr: "La date et le barème",
        textEn: "The date and the scale",
        isCorrect: true,
      },
      {
        textFr: "La liste des parents à prévenir",
        textEn: "The list of parents to notify",
        isCorrect: false,
      },
    ],
  },
  {
    order: 14,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Ouvrez le détail d'une évaluation existante : quel bouton vous fait basculer directement vers la saisie de ses notes ?",
    textEn:
      "Open an existing evaluation's detail: which button takes you straight to entering its grades?",
    hintFr: "Son libellé est une instruction directe.",
    hintEn: "Its label is a direct instruction.",
    explanationFr:
      'Le bouton "Saisir les notes", qui ouvre la liste des élèves avec cette évaluation déjà sélectionnée.',
    explanationEn:
      'The "Enter grades" button, which opens the student list with this evaluation already selected.',
    options: [
      {
        textFr: "Saisir les notes",
        textEn: "Enter grades",
        isCorrect: true,
      },
      { textFr: "Publier", textEn: "Publish", isCorrect: false },
      { textFr: "Supprimer", textEn: "Delete", isCorrect: false },
      {
        textFr: "Envoyer un message",
        textEn: "Send a message",
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
      'Essayez de basculer le statut d\'un élève sur "Absent" pendant la saisie des notes : le champ note reste-t-il modifiable ?',
    textEn:
      'Try switching a student\'s status to "Absent" while entering grades: does the grade field stay editable?',
    hintFr: "Repensez à quel statut active réellement le champ note.",
    hintEn: "Think back to which status actually enables the grade field.",
    explanationFr:
      'Faux : le champ se désactive automatiquement dès que le statut n\'est plus "Note saisie".',
    explanationEn:
      'False: the field disables itself automatically as soon as the status is no longer "Grade entered".',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 16,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Terminez la saisie des notes de toute la classe sur une évaluation, puis revenez à la liste des évaluations : qu'observez-vous sur son compteur ?",
    textEn:
      "Finish entering grades for the whole class on an evaluation, then go back to the evaluations list: what do you notice about its counter?",
    hintFr: "Sa couleur reflète l'état d'avancement.",
    hintEn: "Its colour reflects the completion state.",
    explanationFr:
      "Le compteur affiche l'effectif complet et change de couleur pour signaler que la saisie est terminée.",
    explanationEn:
      "The counter shows the full headcount and changes colour to signal that entry is complete.",
    options: [
      {
        textFr: "Il affiche l'effectif complet et change de couleur",
        textEn: "It shows the full headcount and changes colour",
        isCorrect: true,
      },
      {
        textFr: "Il disparaît",
        textEn: "It disappears",
        isCorrect: false,
      },
      {
        textFr: "Il se remet à zéro",
        textEn: "It resets to zero",
        isCorrect: false,
      },
      {
        textFr: "Rien ne change",
        textEn: "Nothing changes",
        isCorrect: false,
      },
    ],
  },
  {
    order: 17,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Ouvrez le Conseil de classe pour une matière que vous enseignez, rédigez une appréciation et enregistrez-la en Brouillon : que voient les familles ?",
    textEn:
      "Open Class Council for a subject you teach, write an appreciation and save it as Draft: what do families see?",
    hintFr: "Même principe que pour une évaluation en brouillon.",
    hintEn: "Same principle as a draft evaluation.",
    explanationFr:
      "Rien : tant qu'elle reste en brouillon, l'appréciation n'apparaît pas sur le bulletin des familles.",
    explanationEn:
      "Nothing: as long as it stays a draft, the appreciation doesn't appear on the family's report card.",
    options: [
      {
        textFr: "Rien, tant qu'elle n'est pas publiée",
        textEn: "Nothing, until it is published",
        isCorrect: true,
      },
      {
        textFr: "L'appréciation immédiatement",
        textEn: "The appreciation immediately",
        isCorrect: false,
      },
      {
        textFr: "Une notification d'erreur",
        textEn: "An error notification",
        isCorrect: false,
      },
      {
        textFr: "Une version provisoire floutée",
        textEn: "A blurred provisional version",
        isCorrect: false,
      },
    ],
  },
  {
    order: 18,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Repérez le badge sur une évaluation publiée : signifie-t-il que les familles peuvent la consulter dès maintenant ?",
    textEn:
      "Look at the badge on a published evaluation: does it mean families can view it right away?",
    hintFr: "Publié est l'état opposé à Brouillon.",
    hintEn: "Published is the opposite state to Draft.",
    explanationFr:
      "Vrai : dès qu'une évaluation passe en Publié, elle et ses notes déjà saisies deviennent visibles pour les familles.",
    explanationEn:
      "True: as soon as an evaluation is Published, it and its already-entered grades become visible to families.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 19,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Ouvrez l'onglet Évaluations et filtrez par statut de saisie : à quoi cela sert-il ?",
    textEn:
      "Open the Evaluations tab and filter by entry status: what is this useful for?",
    hintFr: "L'icône filtre propose plusieurs critères.",
    hintEn: "The filter icon offers several criteria.",
    explanationFr:
      "À repérer rapidement les évaluations dont la saisie des notes est encore incomplète.",
    explanationEn:
      "To quickly spot evaluations whose grade entry is still incomplete.",
    options: [
      {
        textFr: "Repérer les évaluations à la saisie incomplète",
        textEn: "Spot evaluations with incomplete entry",
        isCorrect: true,
      },
      {
        textFr: "Supprimer plusieurs évaluations d'un coup",
        textEn: "Delete several evaluations at once",
        isCorrect: false,
      },
      {
        textFr: "Changer le barème de toute la classe",
        textEn: "Change the whole class's scale",
        isCorrect: false,
      },
      {
        textFr: "Envoyer les bulletins",
        textEn: "Send report cards",
        isCorrect: false,
      },
    ],
  },
  {
    order: 20,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Pourquoi l'application distingue-t-elle un statut Brouillon et un statut Publié pour les évaluations ?",
    textEn:
      "Why does the app distinguish a Draft status from a Published status for evaluations?",
    hintFr: "Pensez à la préparation en amont, avant que tout soit prêt.",
    hintEn: "Think about preparing ahead, before everything is ready.",
    explanationFr:
      "Pour permettre de préparer une évaluation (barème, date) à l'avance sans l'exposer aux familles tant qu'elle n'est pas finalisée.",
    explanationEn:
      "To allow preparing an evaluation (scale, date) ahead of time without exposing it to families until it is finalised.",
    options: [
      {
        textFr:
          "Pour préparer l'évaluation à l'avance sans l'exposer aux familles",
        textEn:
          "To prepare the evaluation ahead without exposing it to families",
        isCorrect: true,
      },
      {
        textFr: "C'est purement décoratif",
        textEn: "It's purely decorative",
        isCorrect: false,
      },
      {
        textFr: "Brouillon empêche définitivement la publication",
        textEn: "Draft permanently prevents publishing",
        isCorrect: false,
      },
      {
        textFr: "Cela ne change rien pour les familles",
        textEn: "It changes nothing for families",
        isCorrect: false,
      },
    ],
  },
  {
    order: 21,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Dans le Conseil de classe, vous ne pouvez rédiger une appréciation que pour les matières que vous enseignez réellement dans cette classe.",
    textEn:
      "In Class Council, you can only write an appreciation for the subjects you actually teach in that class.",
    hintFr: "Chaque enseignant reste responsable de ses propres matières.",
    hintEn: "Each teacher stays responsible for their own subjects.",
    explanationFr:
      "Vrai : vous ne voyez et ne modifiez que les appréciations des matières que vous enseignez dans cette classe.",
    explanationEn:
      "True: you only see and edit the appreciations for the subjects you teach in that class.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 22,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Un élève est marqué Excusé sur une évaluation publiée : que voient ses parents à la place d'une note ?",
    textEn:
      "A student is marked Excused on a published evaluation: what do their parents see instead of a grade?",
    hintFr: "Le statut lui-même reste visible, mais aucune note.",
    hintEn: "The status itself stays visible, but no grade.",
    explanationFr:
      "Le statut Excusé, sans aucune note chiffrée associée à cette évaluation.",
    explanationEn:
      "The Excused status, with no numeric grade attached to that evaluation.",
    options: [
      {
        textFr: 'Le statut "Excusé", sans note chiffrée',
        textEn: 'The "Excused" status, with no numeric grade',
        isCorrect: true,
      },
      {
        textFr: "Une note de zéro",
        textEn: "A zero grade",
        isCorrect: false,
      },
      {
        textFr: "La moyenne de la classe par défaut",
        textEn: "The class average by default",
        isCorrect: false,
      },
      {
        textFr: "Rien, la ligne disparaît",
        textEn: "Nothing, the row disappears",
        isCorrect: false,
      },
    ],
  },
  {
    order: 23,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "L'onglet Décision, qui permet de statuer sur le passage d'un élève, est réservé au professeur référent de la classe.",
    textEn:
      "The Decision tab, which lets you decide on a student's promotion, is reserved for the class's référent teacher.",
    hintFr: "C'est la même personne qui rédige l'appréciation générale.",
    hintEn: "It's the same person who writes the general appreciation.",
    explanationFr:
      "Vrai : seul le professeur référent de la classe voit et utilise l'onglet Décision.",
    explanationEn:
      "True: only the class's référent teacher sees and uses the Decision tab.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 24,
    type: "MCQ_MULTI",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quelles informations une appréciation de matière transmet-elle qu'une simple note chiffrée ne peut pas transmettre ? (plusieurs réponses)",
    textEn:
      "What information does a subject appreciation convey that a plain numeric grade cannot? (select all that apply)",
    hintFr: "Pensez au texte libre par rapport à un chiffre seul.",
    hintEn: "Think about free text compared to a single number.",
    explanationFr:
      "Le contexte du comportement en classe et des pistes de progrès concrètes — impossibles à résumer par un simple chiffre.",
    explanationEn:
      "Context about classroom behaviour and concrete areas for improvement — impossible to summarise with a single number.",
    options: [
      {
        textFr: "Le contexte du comportement en classe",
        textEn: "Context about classroom behaviour",
        isCorrect: true,
      },
      {
        textFr: "Des pistes de progrès concrètes",
        textEn: "Concrete areas for improvement",
        isCorrect: true,
      },
      {
        textFr: "La moyenne exacte de la classe",
        textEn: "The exact class average",
        isCorrect: false,
      },
      {
        textFr: "Le barème de l'évaluation",
        textEn: "The evaluation's scale",
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
