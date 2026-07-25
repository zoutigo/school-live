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

const SCHOOL_SLUG = "lycee-du-poisson-d-avril";
const CREATOR_EMAIL = "zoutigo@gmail.com";
const TESTER_EMAIL = "tagal@gmx.fr";

async function main() {
  const school = await prisma.school.findUniqueOrThrow({
    where: { slug: SCHOOL_SLUG },
  });

  const creator = await prisma.user.findUniqueOrThrow({
    where: { email: CREATOR_EMAIL },
  });

  const tester = await prisma.user.findUniqueOrThrow({
    where: { email: TESTER_EMAIL },
  });

  const existing = await prisma.testCampaign.findFirst({
    where: { title: "Recette mobile — Module Ressources (Talla)" },
    select: { id: true },
  });

  if (existing) {
    console.log(
      "Campagne déjà présente (id=%s). Seed ignoré pour éviter les doublons.",
      existing.id,
    );
    return;
  }

  const campaignShared = {
    schoolId: school.id,
    createdById: creator.id,
    updatedById: creator.id,
  };

  const caseShared = {
    createdById: creator.id,
    updatedById: creator.id,
    audienceRoles: { create: [{ role: "ADMIN" }] },
  };

  const campaign = await prisma.testCampaign.create({
    data: {
      ...campaignShared,
      title: "Recette mobile — Module Ressources (Talla)",
      description:
        "Parcours complet du module Ressources sur mobile pour l'école Lycée du Poisson d'Avril : " +
        "création d'une évaluation, rédaction et modération de l'énoncé, rédaction et modération du corrigé, " +
        "recherche/filtres et consultation finale dans Mes ressources.",
      status: "ACTIVE",
      testCases: {
        create: [
          {
            ...caseShared,
            orderIndex: 0,
            priority: "HIGH",
            title: "Création d'une nouvelle évaluation (fiche ressource)",
            module: "Ressources",
            objective:
              "Vérifier la création d'une fiche d'évaluation pour l'école Lycée du Poisson d'Avril.",
            preconditions:
              "Être connecté avec le compte admin (rôle ADMIN, accès complet au module Ressources).",
            steps: [
              "Ouvrir le module Ressources",
              "Aller sur l'onglet « Évaluations »",
              "Appuyer sur le bouton de création (Nouvelle évaluation)",
              "Choisir l'école « Lycée du Poisson d'Avril »",
              "Renseigner le titre, le cycle, le niveau, la filière, la matière, la séquence et l'année académique",
              "Enregistrer la fiche",
            ],
            expectedResult:
              "La fiche d'évaluation est créée et visible dans l'onglet « Mes ressources » avec le statut Brouillon pour l'énoncé.",
            evidenceRequired: false,
          },
          {
            ...caseShared,
            orderIndex: 1,
            priority: "CRITICAL",
            title:
              "Rédaction de l'énoncé complet avec image insérée dans l'éditeur",
            module: "Ressources",
            objective:
              "Vérifier la rédaction d'un énoncé complet avec insertion d'image dans l'éditeur de texte enrichi.",
            preconditions:
              "La fiche d'évaluation créée au cas précédent existe.",
            steps: [
              "Ouvrir la fiche d'évaluation créée",
              "Aller sur l'onglet Énoncé",
              "Appuyer sur « Proposer un énoncé »",
              "Rédiger un énoncé complet (plusieurs paragraphes, mise en forme, couleur de texte)",
              "Utiliser la barre d'outils de l'éditeur pour insérer une image dans le texte",
              "Vérifier que l'indicateur « Insertion de l'image… » s'affiche puis disparaît",
              "Vérifier que l'image apparaît correctement dans le corps de l'énoncé",
            ],
            expectedResult:
              "L'énoncé contient le texte formaté et l'image insérée s'affiche correctement dans l'éditeur.",
            evidenceRequired: true,
          },
          {
            ...caseShared,
            orderIndex: 2,
            priority: "HIGH",
            title: "Ajout d'une pièce jointe à l'énoncé et soumission",
            module: "Ressources",
            objective:
              "Vérifier l'ajout d'une pièce jointe (fichier distinct de l'image insérée dans le texte) et la soumission de l'énoncé à validation.",
            preconditions:
              "Un énoncé est en cours de rédaction (cas précédent).",
            steps: [
              "Dans l'écran de rédaction de l'énoncé, appuyer sur « Ajouter une pièce jointe »",
              "Sélectionner un fichier (PDF ou image) depuis l'appareil",
              "Vérifier que la pièce jointe apparaît dans la liste des pièces jointes",
              "Appuyer sur « Soumettre à validation »",
            ],
            expectedResult:
              "La pièce jointe est ajoutée à la proposition et le statut de l'énoncé passe à « En attente de validation ».",
            evidenceRequired: true,
          },
          {
            ...caseShared,
            orderIndex: 3,
            priority: "MEDIUM",
            title: "Aperçu de l'énoncé en attente dans « Mes ressources »",
            module: "Ressources",
            objective:
              "Vérifier que la ressource avec énoncé en attente est visible et correctement affichée dans Mes ressources.",
            preconditions:
              "L'énoncé a été soumis à validation (cas précédent).",
            steps: [
              "Ouvrir le module Ressources",
              "Aller sur l'onglet « Mes ressources »",
              "Repérer la fiche d'évaluation créée",
              "Ouvrir la fiche et vérifier le statut « En attente de validation » sur l'énoncé",
            ],
            expectedResult:
              "La ressource apparaît dans Mes ressources avec le statut d'énoncé « En attente de validation » et le contenu rédigé (texte + image) est visible en aperçu.",
            evidenceRequired: false,
          },
          {
            ...caseShared,
            orderIndex: 4,
            priority: "CRITICAL",
            title:
              "Modération de l'énoncé : visualisation image, téléchargement pièce jointe, validation",
            module: "Ressources",
            objective:
              "Vérifier le parcours de modération complet d'un énoncé proposé : consultation, image, pièce jointe et validation.",
            preconditions:
              "Un énoncé est en attente de validation (cas précédent). Le compte admin a accès à l'onglet Modération.",
            steps: [
              "Ouvrir le module Ressources",
              "Aller sur l'onglet « Modération »",
              "Sélectionner le sous-onglet « Énoncé »",
              "Ouvrir la soumission correspondant à la fiche créée",
              "Vérifier l'en-tête « Modération — Énoncé » et l'auteur de la proposition (« Proposé par »)",
              "Visualiser l'image insérée dans le contenu proposé (zoom / affichage plein écran si disponible)",
              "Appuyer sur la pièce jointe pour la télécharger et l'ouvrir",
              "Vérifier que le fichier téléchargé s'ouvre correctement",
              "Appuyer sur « Valider celle-ci »",
            ],
            expectedResult:
              "L'image s'affiche correctement, la pièce jointe se télécharge et s'ouvre sans erreur, et après validation le statut de l'énoncé passe à « Validé ».",
            evidenceRequired: true,
          },
          {
            ...caseShared,
            orderIndex: 5,
            priority: "MEDIUM",
            title: "Aperçu de l'énoncé validé dans « Mes ressources »",
            module: "Ressources",
            objective:
              "Vérifier que l'énoncé validé s'affiche correctement (contenu retenu) dans Mes ressources.",
            preconditions:
              "L'énoncé a été validé en modération (cas précédent).",
            steps: [
              "Ouvrir l'onglet « Mes ressources »",
              "Ouvrir la fiche d'évaluation",
              "Vérifier le statut « Validé » et le libellé « Contenu retenu » sur l'énoncé",
              "Vérifier que le texte et l'image sont correctement affichés",
            ],
            expectedResult:
              "L'énoncé validé s'affiche comme contenu retenu, avec le texte et l'image intacts.",
            evidenceRequired: false,
          },
          {
            ...caseShared,
            orderIndex: 6,
            priority: "CRITICAL",
            title:
              "Rédaction du corrigé complet avec image insérée dans l'éditeur",
            module: "Ressources",
            objective:
              "Vérifier la rédaction d'un corrigé complet avec insertion d'image, disponible uniquement après validation de l'énoncé.",
            preconditions: "L'énoncé de la fiche est validé (cas précédent).",
            steps: [
              "Ouvrir la fiche d'évaluation",
              "Aller sur l'onglet Corrigé",
              "Appuyer sur « Proposer un corrigé »",
              "Rédiger un corrigé complet et détaillé",
              "Utiliser la barre d'outils de l'éditeur pour insérer une image dans le texte du corrigé",
              "Vérifier que l'image s'affiche correctement dans le corrigé",
            ],
            expectedResult:
              "Le corrigé est rédigé avec une image insérée correctement affichée dans l'éditeur.",
            evidenceRequired: true,
          },
          {
            ...caseShared,
            orderIndex: 7,
            priority: "HIGH",
            title: "Ajout d'une pièce jointe au corrigé et soumission",
            module: "Ressources",
            objective:
              "Vérifier l'ajout d'une pièce jointe au corrigé et sa soumission à validation.",
            preconditions:
              "Un corrigé est en cours de rédaction (cas précédent).",
            steps: [
              "Dans l'écran de rédaction du corrigé, appuyer sur « Ajouter une pièce jointe »",
              "Sélectionner un fichier depuis l'appareil",
              "Vérifier que la pièce jointe apparaît dans la liste",
              "Appuyer sur « Soumettre à validation »",
            ],
            expectedResult:
              "La pièce jointe est ajoutée et le statut du corrigé passe à « En attente de validation ».",
            evidenceRequired: true,
          },
          {
            ...caseShared,
            orderIndex: 8,
            priority: "CRITICAL",
            title:
              "Modération du corrigé : visualisation image, téléchargement pièce jointe, validation",
            module: "Ressources",
            objective:
              "Vérifier le parcours de modération complet d'un corrigé proposé, avec les mêmes vérifications que pour l'énoncé.",
            preconditions:
              "Un corrigé est en attente de validation (cas précédent).",
            steps: [
              "Ouvrir le module Ressources puis l'onglet « Modération »",
              "Sélectionner le sous-onglet « Corrigé »",
              "Ouvrir la soumission correspondant à la fiche créée",
              "Vérifier l'en-tête « Modération — Corrigé » et l'énoncé de référence affiché en comparaison",
              "Visualiser l'image insérée dans le corrigé proposé",
              "Télécharger et ouvrir la pièce jointe du corrigé",
              "Appuyer sur « Valider celle-ci »",
            ],
            expectedResult:
              "L'image et la pièce jointe du corrigé sont consultables sans erreur, et après validation le corrigé passe au statut « Validé ».",
            evidenceRequired: true,
          },
          {
            ...caseShared,
            orderIndex: 9,
            priority: "HIGH",
            title: "Recherche et filtres dans la liste des évaluations",
            module: "Ressources",
            objective:
              "Vérifier la recherche et les filtres (école, niveau, séquence, type) dans la liste des évaluations, puis la consultation complète d'une fiche trouvée.",
            preconditions:
              "La fiche créée a son énoncé et son corrigé validés.",
            steps: [
              "Ouvrir le module Ressources, onglet « Évaluations »",
              "Appuyer sur « Rechercher » et saisir le titre de la fiche créée",
              "Vérifier que la fiche apparaît dans les résultats",
              "Ouvrir le panneau de filtres et filtrer par établissement « Lycée du Poisson d'Avril »",
              "Filtrer également par niveau et par séquence utilisés à la création",
              "Appliquer les filtres et vérifier que la fiche reste visible",
              "Réinitialiser les filtres",
              "Ouvrir la fiche depuis les résultats de recherche",
              "Télécharger les pièces jointes de l'énoncé et du corrigé",
              "Visualiser les images insérées dans l'éditeur de texte pour l'énoncé et le corrigé",
            ],
            expectedResult:
              "La recherche et les filtres renvoient la fiche attendue, les pièces jointes se téléchargent correctement et les images s'affichent dans l'éditeur de contenu.",
            evidenceRequired: true,
          },
          {
            ...caseShared,
            orderIndex: 10,
            priority: "MEDIUM",
            title: "Vérification finale dans « Mes ressources »",
            module: "Ressources",
            objective:
              "Vérifier l'état final de la fiche (énoncé et corrigé validés) dans l'onglet Mes ressources.",
            preconditions: "L'énoncé et le corrigé de la fiche sont validés.",
            steps: [
              "Ouvrir l'onglet « Mes ressources »",
              "Repérer la fiche d'évaluation créée durant la campagne",
              "Ouvrir la fiche et vérifier les deux onglets Énoncé et Corrigé",
              "Vérifier que les statuts sont « Validé » avec le contenu retenu, texte, image et pièce jointe",
            ],
            expectedResult:
              "La fiche affiche un énoncé et un corrigé validés, complets, avec texte, image et pièce jointe accessibles.",
            evidenceRequired: false,
          },
        ],
      },
    },
  });

  console.log(`✅ Campagne créée : ${campaign.title} (id=${campaign.id})`);

  await prisma.testCampaignAssignment.create({
    data: {
      campaignId: campaign.id,
      userId: tester.id,
      assignedById: creator.id,
      note: "Parcours complet du module Ressources : création d'évaluation, énoncé et corrigé avec image insérée + pièce jointe, modération, recherche/filtres, consultation finale dans Mes ressources.",
    },
  });

  console.log(`✅ Campagne assignée à ${tester.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
