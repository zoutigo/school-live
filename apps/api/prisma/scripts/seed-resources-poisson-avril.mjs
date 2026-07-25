/**
 * Seed massif du module Ressources pour l'école "Lycée du Poisson d'Avril" :
 * au moins 100 fiches réalistes (ASSESSMENT scopées à l'école + quelques EXAM
 * nationaux), réparties sur plusieurs matières, plusieurs niveaux (6ème à
 * Terminale) et plusieurs années académiques, avec toute la variété d'états
 * attendue pour tester le circuit de soumission/modération :
 *
 * - certaines fiches n'ont encore reçu aucune proposition ;
 * - d'autres ont un énoncé en attente de modération, ou un énoncé refusé ;
 * - d'autres ont un énoncé approuvé sans corrigé ;
 * - d'autres ont un énoncé approuvé et un corrigé en attente ou refusé ;
 * - d'autres ont énoncé + corrigé tous les deux approuvés.
 *
 * Chaque énoncé/corrigé est un vrai contenu pédagogique HTML avec plusieurs
 * exercices numérotés (comme un vrai sujet), parfois accompagné d'une image
 * inline (schéma/scan) et/ou d'une pièce jointe (PDF/photo).
 *
 * Usage (dans le conteneur scolive-api-1) :
 *   node apps/api/prisma/scripts/seed-resources-poisson-avril.mjs
 */
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
for (const candidate of [
  path.resolve(__dirname, "../../../docker/.env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
]) {
  dotenv.config({ path: candidate, override: false });
}

const prisma = new PrismaClient();

const MEDIA_BASE = (
  process.env.MEDIA_PUBLIC_BASE_URL ?? "http://localhost:9000/school-live-media"
).replace(/\/+$/, "");

const SCHOOL_SLUG = "lycee-du-poisson-d-avril";
const REVIEWER_EMAIL = "plizaweb@gmail.com"; // SCHOOL_ADMIN de l'école
const TOTAL_TARGET = 105;

const LEVEL_CODES = ["6EME", "5EME", "4EME", "3EME", "2NDE", "1ERE", "TLE"];
const SUBJECT_CODES = [
  "MATH",
  "FR",
  "ANG",
  "HIST",
  "GEO",
  "SVT",
  "PHYS",
  "CHIM",
  "TECH",
  "EC",
  "EPS",
  "ART",
  "MUS",
];

function currentAcademicYearLabel(now = new Date()) {
  const year = now.getFullYear();
  return now.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}
function yearMinus(label, n) {
  const [start] = label.split("-").map((s) => parseInt(s, 10));
  return `${start - n}-${start - n + 1}`;
}
const CURRENT_YEAR = currentAcademicYearLabel();
const PREVIOUS_YEAR = yearMinus(CURRENT_YEAR, 1);
const OLDER_YEAR = yearMinus(CURRENT_YEAR, 2);

// Pixel PNG 1x1 rouge, valide et minuscule : sert de "photo/scan" inline dans
// les contenus riches sans dépendre d'un accès réseau.
const INLINE_IMAGE_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function pick(arr, i) {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260714);
function chance(p) {
  return rng() < p;
}

// ── Banques d'exercices réalistes par matière ────────────────────────────
const EXERCISE_BANK = {
  MATH: [
    {
      title: "Calcul numérique",
      statement:
        "<p>Calculer en détaillant les étapes :</p><ol><li>A = 12,5 + 7,25 × 4</li><li>B = (18 − 6) ÷ 3 + 5²</li><li>C = 3/4 + 5/6 (donner le résultat sous forme de fraction irréductible)</li></ol>",
      correction:
        "<p>A = 12,5 + 29 = 41,5</p><p>B = 12 ÷ 3 + 25 = 4 + 25 = 29</p><p>C = 9/12 + 10/12 = 19/12</p>",
      points: 6,
    },
    {
      title: "Géométrie — Triangle rectangle",
      statement:
        "<p>ABC est un triangle rectangle en A tel que AB = 6 cm et AC = 8 cm.</p><ol><li>Calculer la longueur BC.</li><li>Calculer l'aire du triangle ABC.</li></ol>",
      correction:
        "<p>D'après le théorème de Pythagore : BC² = AB² + AC² = 36 + 64 = 100, donc BC = 10 cm.</p><p>Aire = (AB × AC) ÷ 2 = (6 × 8) ÷ 2 = 24 cm².</p>",
      points: 7,
    },
    {
      title: "Problème — Proportionnalité",
      statement:
        "<p>Un fermier récolte 45 kg de tomates sur 3 rangs identiques.</p><ol><li>Quelle masse récolte-t-il sur 7 rangs identiques ?</li><li>Combien de rangs faut-il pour récolter 150 kg ?</li></ol>",
      correction:
        "<p>1 rang produit 45 ÷ 3 = 15 kg. Pour 7 rangs : 15 × 7 = 105 kg.</p><p>Pour 150 kg : 150 ÷ 15 = 10 rangs.</p>",
      points: 5,
    },
    {
      title: "Équation du premier degré",
      statement:
        "<p>Résoudre l'équation suivante : 5x − 3 = 2x + 12</p><p>Vérifier le résultat obtenu.</p>",
      correction:
        "<p>5x − 2x = 12 + 3 → 3x = 15 → x = 5.</p><p>Vérification : 5×5 − 3 = 22 et 2×5 + 12 = 22. Égalité vérifiée.</p>",
      points: 4,
    },
    {
      title: "Fonctions affines",
      statement:
        "<p>Soit f(x) = 3x − 2.</p><ol><li>Calculer f(0) et f(4).</li><li>Déterminer l'antécédent de 7 par f.</li><li>Tracer la représentation graphique de f.</li></ol>",
      correction:
        "<p>f(0) = −2, f(4) = 10.</p><p>3x − 2 = 7 → x = 3.</p><p>Droite passant par (0 ; −2) et (3 ; 7).</p>",
      points: 6,
    },
  ],
  FR: [
    {
      title: "Compréhension de texte",
      statement:
        "<p>Lisez attentivement l'extrait distribué en annexe, puis répondez :</p><ol><li>Qui est le narrateur du récit ?</li><li>Relevez deux indices montrant le sentiment du personnage principal.</li><li>Proposez un autre titre pour ce passage.</li></ol>",
      correction:
        "<p>Le narrateur est le personnage principal, qui raconte à la première personne.</p><p>Indices possibles : le rythme des phrases courtes, le champ lexical de l'inquiétude.</p><p>Titre libre, à valider selon la pertinence de la justification.</p>",
      points: 8,
    },
    {
      title: "Grammaire — Les classes de mots",
      statement:
        "<p>Dans la phrase suivante, indiquez la classe grammaticale de chaque mot souligné :</p><p><em>« Le vieux pêcheur regardait patiemment la mer agitée. »</em></p>",
      correction:
        "<p>vieux : adjectif qualificatif — pêcheur : nom commun — regardait : verbe conjugué — patiemment : adverbe — agitée : adjectif qualificatif (participe passé employé comme adjectif).</p>",
      points: 5,
    },
    {
      title: "Expression écrite",
      statement:
        "<p>Rédigez un texte narratif d'une quinzaine de lignes racontant un souvenir marquant de vacances. Vous emploierez au moins trois connecteurs temporels.</p>",
      correction:
        "<p>Barème indicatif : cohérence du récit (4 pts), richesse du vocabulaire (3 pts), orthographe et syntaxe (3 pts), respect de la consigne (connecteurs temporels, 2 pts).</p>",
      points: 12,
    },
    {
      title: "Conjugaison",
      statement:
        "<p>Conjuguez les verbes entre parenthèses au temps indiqué :</p><ol><li>Nous (finir, passé composé) nos devoirs.</li><li>Il (falloir, futur simple) réviser avant l'examen.</li></ol>",
      correction:
        "<p>1. Nous avons fini nos devoirs.</p><p>2. Il faudra réviser avant l'examen.</p>",
      points: 4,
    },
  ],
  ANG: [
    {
      title: "Reading comprehension",
      statement:
        "<p>Read the passage provided in the appendix and answer in complete sentences:</p><ol><li>Where does the story take place?</li><li>What is the main character's problem?</li><li>How is the problem solved at the end?</li></ol>",
      correction:
        "<p>Answers should be full sentences referencing the text precisely; accept any answer supported by the passage.</p>",
      points: 6,
    },
    {
      title: "Grammar — Present perfect vs. past simple",
      statement:
        "<p>Fill in the blanks with the correct tense:</p><ol><li>She ___ (visit) Douala three times.</li><li>Yesterday, we ___ (watch) a documentary about elephants in Waza National Park.</li></ol>",
      correction:
        "<p>1. has visited (present perfect — unspecified time)</p><p>2. watched (past simple — yesterday is a specific past time)</p>",
      points: 4,
    },
    {
      title: "Translation",
      statement:
        "<p>Translate into English: « Mon frère apprend l'anglais depuis deux ans et il parle déjà couramment. »</p>",
      correction:
        '<p>Accepted answer: "My brother has been learning English for two years and he already speaks fluently."</p>',
      points: 4,
    },
  ],
  HIST: [
    {
      title: "Analyse de document",
      statement:
        "<p>À partir du document (carte/affiche fournie en annexe), répondez :</p><ol><li>Identifiez la nature et la date du document.</li><li>Quel événement historique majeur illustre-t-il ?</li><li>Expliquez en quelques lignes son importance.</li></ol>",
      correction:
        "<p>Attendus : identification précise du type de document, contextualisation chronologique correcte, argumentation cohérente sur l'importance historique.</p>",
      points: 8,
    },
    {
      title: "Frise chronologique",
      statement:
        "<p>Placez sur une frise chronologique les événements suivants et donnez leur date : indépendance du Cameroun, réunification, adoption de la constitution actuelle.</p>",
      correction:
        "<p>1er janvier 1960 (indépendance), 1er octobre 1961 (réunification), 18 janvier 1996 (révision constitutionnelle majeure).</p>",
      points: 6,
    },
  ],
  GEO: [
    {
      title: "Lecture de carte",
      statement:
        "<p>Sur la carte fournie en annexe, localisez et nommez trois grands fleuves d'Afrique centrale, puis indiquez leur importance économique.</p>",
      correction:
        "<p>Exemples attendus : Congo, Sanaga, Nyong — importance pour l'hydroélectricité, la pêche et le transport fluvial.</p>",
      points: 6,
    },
    {
      title: "Climat et végétation",
      statement:
        "<p>Décrivez les caractéristiques du climat équatorial et son influence sur la végétation.</p>",
      correction:
        "<p>Climat chaud et humide toute l'année, précipitations abondantes réparties sur l'année, favorisant la forêt dense.</p>",
      points: 5,
    },
  ],
  SVT: [
    {
      title: "Schéma légendé",
      statement:
        "<p>Reproduisez et légendez le schéma de la cellule fourni en annexe (membrane, noyau, cytoplasme, mitochondrie).</p>",
      correction:
        "<p>Barème : chaque légende correcte (1 pt), soin du schéma (1 pt).</p>",
      points: 5,
    },
    {
      title: "Digestion",
      statement:
        "<p>Décrivez le trajet des aliments dans le tube digestif en citant les organes traversés dans l'ordre.</p>",
      correction:
        "<p>Bouche → œsophage → estomac → intestin grêle → gros intestin → anus.</p>",
      points: 5,
    },
  ],
  PHYS: [
    {
      title: "Circuit électrique",
      statement:
        "<p>On dispose d'un circuit série comportant une pile de 4,5 V et deux résistors identiques.</p><ol><li>Faire le schéma du circuit avec ses symboles normalisés.</li><li>Sachant que l'intensité mesurée est de 0,3 A, calculer la résistance totale du circuit.</li></ol>",
      correction:
        "<p>Schéma attendu avec pile, interrupteur, deux résistors en série et un ampèremètre.</p><p>R = U ÷ I = 4,5 ÷ 0,3 = 15 Ω.</p>",
      points: 7,
    },
    {
      title: "Mouvement et vitesse",
      statement:
        "<p>Un cycliste parcourt 18 km en 45 minutes. Calculer sa vitesse moyenne en km/h puis en m/s.</p>",
      correction:
        "<p>v = 18 ÷ 0,75 = 24 km/h. En m/s : 24 × 1000 ÷ 3600 ≈ 6,67 m/s.</p>",
      points: 4,
    },
  ],
  CHIM: [
    {
      title: "Équation chimique",
      statement:
        "<p>Équilibrer l'équation de combustion du méthane : CH₄ + O₂ → CO₂ + H₂O</p>",
      correction: "<p>CH₄ + 2 O₂ → CO₂ + 2 H₂O</p>",
      points: 4,
    },
    {
      title: "Classification périodique",
      statement:
        "<p>Donnez le symbole, le numéro atomique et le nombre d'électrons de valence de l'oxygène, du carbone et de l'azote.</p>",
      correction:
        "<p>O : Z=8, 6 électrons de valence. C : Z=6, 4 électrons de valence. N : Z=7, 5 électrons de valence.</p>",
      points: 6,
    },
  ],
  TECH: [
    {
      title: "Schéma technique",
      statement:
        "<p>Réalisez le schéma cinématique simplifié d'un système bielle-manivelle et identifiez la nature du mouvement en entrée et en sortie.</p>",
      correction:
        "<p>Entrée : mouvement de rotation continue. Sortie : mouvement de translation alternative.</p>",
      points: 6,
    },
  ],
  EC: [
    {
      title: "Institutions de la République",
      statement:
        "<p>Citez trois institutions de la République du Cameroun et précisez le rôle de chacune.</p>",
      correction:
        "<p>Assemblée nationale (vote des lois), Président de la République (chef de l'exécutif), Conseil constitutionnel (contrôle de constitutionnalité).</p>",
      points: 6,
    },
  ],
  EPS: [
    {
      title: "Règlement sportif",
      statement:
        "<p>Expliquez la règle du hors-jeu au football et donnez un exemple illustrant une situation de hors-jeu.</p>",
      correction:
        "<p>Un joueur est hors-jeu s'il est plus proche de la ligne de but adverse que le ballon et l'avant-dernier défenseur au moment de la passe, sauf exceptions prévues par le règlement.</p>",
      points: 4,
    },
  ],
  ART: [
    {
      title: "Analyse d'œuvre",
      statement:
        "<p>Observez l'œuvre reproduite en annexe et décrivez sa composition, ses couleurs dominantes et l'impression qu'elle produit.</p>",
      correction:
        "<p>Réponse libre argumentée ; valoriser le vocabulaire spécifique (composition, contraste, perspective, palette chromatique).</p>",
      points: 5,
    },
  ],
  MUS: [
    {
      title: "Solfège",
      statement:
        "<p>Sur la portée fournie en annexe, identifiez le nom des notes indiquées et leur valeur rythmique (noire, blanche, croche).</p>",
      correction:
        "<p>Barème : chaque note correctement identifiée (0,5 pt), chaque valeur rythmique correcte (0,5 pt).</p>",
      points: 5,
    },
  ],
};

function buildContentHtml({
  subjectCode,
  subjectName,
  levelLabel,
  sequenceLabel,
  academicYearLabel,
  variantIndex,
  withImage,
  isCorrection,
  isMockExam,
}) {
  const bank = EXERCISE_BANK[subjectCode] ?? EXERCISE_BANK.MATH;
  const exerciseCount = isMockExam ? 4 : 3;
  const exercises = [];
  for (let i = 0; i < exerciseCount; i += 1) {
    exercises.push(pick(bank, variantIndex + i));
  }

  const intro = isCorrection
    ? `<p><strong>Corrigé — ${subjectName} — ${levelLabel}</strong></p><p>Barème total : ${exercises.reduce(
        (sum, e) => sum + e.points,
        0,
      )} points.</p>`
    : `<p><strong>${subjectName} — ${levelLabel}</strong>${
        sequenceLabel ? ` — ${sequenceLabel}` : ""
      } — Année ${academicYearLabel}</p><p>Durée conseillée : ${
        isMockExam ? "2 heures" : "1 heure"
      }. Le soin et la rédaction seront pris en compte dans la notation.</p>`;

  const body = exercises
    .map((exercise, index) => {
      const heading = `Exercice ${index + 1} (${exercise.points} points) — ${exercise.title}`;
      const content = isCorrection ? exercise.correction : exercise.statement;
      return `<h3>${heading}</h3>${content}`;
    })
    .join("");

  const imageBlock = withImage
    ? `<p><img src="${INLINE_IMAGE_DATA_URI}" alt="${
        isCorrection ? "Corrigé scanné" : "Schéma / annexe de l'énoncé"
      }" /></p><p><em>${
        isCorrection
          ? "Annexe corrigée jointe ci-dessus."
          : "Voir schéma/annexe ci-dessus fourni avec le sujet."
      }</em></p>`
    : "";

  return `${intro}${body}${imageBlock}`;
}

function buildAttachment({ resourceId, submissionId, part, variantIndex }) {
  const isImage = variantIndex % 2 === 0;
  const fileName = isImage
    ? `photo-${part.toLowerCase()}-${variantIndex}.jpg`
    : `${part.toLowerCase()}-scanne-${variantIndex}.pdf`;
  const mimeType = isImage ? "image/jpeg" : "application/pdf";
  const sizeLabel = isImage ? "812 Ko" : "1,4 Mo";
  return {
    resourceId,
    submissionId,
    part,
    fileName,
    fileUrl: `${MEDIA_BASE}/resources/${resourceId}/${part.toLowerCase()}/${fileName}`,
    sizeLabel,
    mimeType,
  };
}

// ── Profils de statut (poids sur 100) ────────────────────────────────────
const PROFILES = [
  { key: "empty", weight: 10 },
  { key: "statement_awaiting", weight: 14 },
  { key: "statement_rejected", weight: 6 },
  { key: "statement_approved_only", weight: 28 },
  { key: "statement_approved_correction_awaiting", weight: 18 },
  { key: "statement_approved_correction_rejected", weight: 6 },
  { key: "statement_approved_correction_approved", weight: 18 },
];
const PROFILE_SEQUENCE = PROFILES.flatMap((p) => Array(p.weight).fill(p.key));

async function loadCatalog() {
  const [levels, subjects, school] = await Promise.all([
    prisma.academicLevel.findMany({
      where: { schoolId: null, code: { in: LEVEL_CODES } },
      select: { id: true, code: true, label: true },
    }),
    prisma.subject.findMany({
      where: { schoolId: null, code: { in: SUBJECT_CODES } },
      select: { id: true, code: true, name: true },
    }),
    prisma.school.findUniqueOrThrow({
      where: { slug: SCHOOL_SLUG },
      select: { id: true, name: true },
    }),
  ]);
  if (levels.length === 0 || subjects.length === 0) {
    throw new Error("Catalogue national (niveaux/matières) introuvable.");
  }
  return { levels, subjects, school };
}

async function loadUsers(schoolId) {
  const reviewer = await prisma.user.findUnique({
    where: { email: REVIEWER_EMAIL },
    select: { id: true },
  });
  if (!reviewer) {
    throw new Error(`Utilisateur reviewer introuvable pour ${REVIEWER_EMAIL}`);
  }

  const teacherMemberships = await prisma.schoolMembership.findMany({
    where: { schoolId, role: "TEACHER" },
    select: { userId: true },
    distinct: ["userId"],
  });
  const contributorIds = Array.from(
    new Set(teacherMemberships.map((m) => m.userId).concat(reviewer.id)),
  );
  return { reviewer, contributorIds };
}

async function main() {
  const { levels, subjects, school } = await loadCatalog();
  const { reviewer, contributorIds } = await loadUsers(school.id);

  const existing = await prisma.resource.count({
    where: { schoolId: school.id },
  });
  if (existing > 0) {
    console.log(
      `Des ressources existent déjà pour ${school.name} (${existing}). Seed ignoré pour éviter les doublons.`,
    );
    return;
  }

  const summary = {
    created: 0,
    byProfile: {},
    byKind: {},
    subjects: new Set(),
    levels: new Set(),
    years: new Set(),
  };

  let index = 0;
  while (summary.created < TOTAL_TARGET) {
    const isAssessment = index % 5 !== 0; // ~80% ASSESSMENT (école), ~20% EXAM national
    const subject = pick(subjects, index * 3 + 1);
    const level = pick(levels, index * 5 + 2);
    const schoolId = isAssessment ? school.id : null;
    const sequence = isAssessment
      ? pick(["SEQ_1", "SEQ_2", "SEQ_3", "SEQ_4", "SEQ_5", "SEQ_6"], index)
      : null;
    const examType = isAssessment
      ? pick(["SEQUENCE_TEST", "POP_QUIZ"], index)
      : "MOCK_EXAM";
    const yearRoll = index % 10;
    const academicYearLabel =
      yearRoll < 7 ? CURRENT_YEAR : yearRoll < 9 ? PREVIOUS_YEAR : OLDER_YEAR;
    const profileKey = pick(PROFILE_SEQUENCE, index);

    const author = pick(contributorIds, index);
    const statementAuthor = pick(contributorIds, index + 1);
    const correctionAuthor = pick(contributorIds, index + 2);

    const sequenceLabel = sequence
      ? `Séquence ${sequence.split("_")[1]}`
      : null;
    const titlePrefix = isAssessment
      ? examType === "POP_QUIZ"
        ? "Interrogation surprise"
        : "Devoir de séquence"
      : "Examen blanc";
    const title = `${titlePrefix} — ${subject.name} (${level.label})${
      sequenceLabel ? ` — ${sequenceLabel}` : ""
    } — ${academicYearLabel}`;

    const resource = await prisma.resource.create({
      data: {
        kind: isAssessment ? "ASSESSMENT" : "EXAM",
        schoolId,
        academicLevelId: level.id,
        subjectId: subject.id,
        examType,
        sequence,
        academicYearLabel,
        title,
        authorUserId: author,
        statementContent: null,
        correctionContent: null,
        auditLogs: { create: { actorUserId: author, action: "SUBMIT" } },
      },
      select: { id: true },
    });

    const withStatement = profileKey !== "empty";
    if (withStatement) {
      const statementVariant = index % EXERCISE_BANK.MATH.length;
      const withImage = chance(0.3);
      const withAttachment = chance(0.4);
      const statementHtml = buildContentHtml({
        subjectCode: subject.code,
        subjectName: subject.name,
        levelLabel: level.label,
        sequenceLabel,
        academicYearLabel,
        variantIndex: statementVariant,
        withImage,
        isCorrection: false,
        isMockExam: !isAssessment,
      });

      const statementStatus =
        profileKey === "statement_awaiting" ? "AWAITING" : "APPROVED";
      const isRejected = profileKey === "statement_rejected";

      const submission = await prisma.resourceSubmission.create({
        data: {
          resourceId: resource.id,
          part: "STATEMENT",
          authorUserId: statementAuthor,
          content: statementHtml,
          status: isRejected ? "REJECTED" : statementStatus,
          reason: isRejected
            ? "Énoncé incomplet : merci de préciser le barème par exercice."
            : null,
          reviewedByUserId:
            isRejected || statementStatus === "APPROVED" ? reviewer.id : null,
          reviewedAt:
            isRejected || statementStatus === "APPROVED" ? new Date() : null,
        },
        select: { id: true },
      });

      if (withAttachment) {
        await prisma.resourceAttachment.create({
          data: buildAttachment({
            resourceId: resource.id,
            submissionId: submission.id,
            part: "STATEMENT",
            variantIndex: index,
          }),
        });
      }

      if (statementStatus === "APPROVED" && !isRejected) {
        await prisma.resource.update({
          where: { id: resource.id },
          data: {
            statementContent: statementHtml,
            statementStatus: "APPROVED",
            statementApprovedByUserId: reviewer.id,
            statementApprovedAt: new Date(),
            statementSubmissionId: submission.id,
          },
        });

        const needsCorrection =
          profileKey === "statement_approved_correction_awaiting" ||
          profileKey === "statement_approved_correction_rejected" ||
          profileKey === "statement_approved_correction_approved";

        if (needsCorrection) {
          const correctionVariant = (index + 2) % EXERCISE_BANK.MATH.length;
          const correctionWithImage = chance(0.25);
          const correctionWithAttachment = chance(0.35);
          const correctionHtml = buildContentHtml({
            subjectCode: subject.code,
            subjectName: subject.name,
            levelLabel: level.label,
            sequenceLabel,
            academicYearLabel,
            variantIndex: correctionVariant,
            withImage: correctionWithImage,
            isCorrection: true,
            isMockExam: !isAssessment,
          });

          const isCorrectionRejected =
            profileKey === "statement_approved_correction_rejected";
          const correctionStatus =
            profileKey === "statement_approved_correction_awaiting"
              ? "AWAITING"
              : "APPROVED";

          const correctionSubmission = await prisma.resourceSubmission.create({
            data: {
              resourceId: resource.id,
              part: "CORRECTION",
              authorUserId: correctionAuthor,
              content: correctionHtml,
              status: isCorrectionRejected ? "REJECTED" : correctionStatus,
              reason: isCorrectionRejected
                ? "Corrigé incomplet : la méthode de résolution doit être détaillée."
                : null,
              reviewedByUserId:
                isCorrectionRejected || correctionStatus === "APPROVED"
                  ? reviewer.id
                  : null,
              reviewedAt:
                isCorrectionRejected || correctionStatus === "APPROVED"
                  ? new Date()
                  : null,
            },
            select: { id: true },
          });

          if (correctionWithAttachment) {
            await prisma.resourceAttachment.create({
              data: buildAttachment({
                resourceId: resource.id,
                submissionId: correctionSubmission.id,
                part: "CORRECTION",
                variantIndex: index + 1,
              }),
            });
          }

          if (correctionStatus === "APPROVED" && !isCorrectionRejected) {
            await prisma.resource.update({
              where: { id: resource.id },
              data: {
                correctionContent: correctionHtml,
                correctionStatus: "APPROVED",
                correctionApprovedByUserId: reviewer.id,
                correctionApprovedAt: new Date(),
                correctionSubmissionId: correctionSubmission.id,
              },
            });
          }
        }
      }
    }

    summary.created += 1;
    summary.byProfile[profileKey] = (summary.byProfile[profileKey] ?? 0) + 1;
    summary.byKind[isAssessment ? "ASSESSMENT" : "EXAM"] =
      (summary.byKind[isAssessment ? "ASSESSMENT" : "EXAM"] ?? 0) + 1;
    summary.subjects.add(subject.name);
    summary.levels.add(level.label);
    summary.years.add(academicYearLabel);
    index += 1;
  }

  console.log(
    JSON.stringify(
      {
        school: school.name,
        created: summary.created,
        byProfile: summary.byProfile,
        byKind: summary.byKind,
        subjectsUsed: [...summary.subjects],
        levelsUsed: [...summary.levels],
        yearsUsed: [...summary.years],
      },
      null,
      2,
    ),
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
