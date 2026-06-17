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

const SCHOOL_SLUG = "college-vogt";
const CREATOR_EMAIL = "plizaweb@gmail.com";

async function main() {
  const school = await prisma.school.findUniqueOrThrow({
    where: { slug: SCHOOL_SLUG },
  });

  const creator = await prisma.user.findUniqueOrThrow({
    where: { email: CREATOR_EMAIL },
  });

  const existing = await prisma.testCampaign.findMany({
    where: { schoolId: school.id },
    select: { title: true },
  });

  if (existing.length > 0) {
    console.log(
      `Campagnes déjà présentes dans ${SCHOOL_SLUG} :`,
      existing.map((c) => c.title),
    );
    console.log("Seed ignoré pour éviter les doublons.");
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
  };

  // Campagne 1 — Messagerie
  const c1 = await prisma.testCampaign.create({
    data: {
      ...campaignShared,
      title: "Recette mobile v1.4 — Messagerie",
      description: "Validation du module Messagerie sur l'application mobile.",
      targetVersion: "1.4",
      status: "ACTIVE",
      dueAt: new Date("2026-07-15T00:00:00.000Z"),
      testCases: {
        create: [
          {
            ...caseShared,
            orderIndex: 0,
            priority: "HIGH",
            title: "Envoi d'un message simple",
            module: "Messagerie",
            objective:
              "Vérifier qu'un parent peut envoyer un message à un enseignant.",
            preconditions:
              "Être connecté en tant que parent avec au moins un enseignant dans les contacts.",
            steps: [
              "Ouvrir le module Messagerie",
              "Appuyer sur Composer",
              "Sélectionner un destinataire",
              "Saisir un message",
              "Appuyer sur Envoyer",
            ],
            expectedResult:
              "Le message apparaît dans la boîte d'envoi et est reçu par le destinataire.",
            evidenceRequired: false,
          },
          {
            ...caseShared,
            orderIndex: 1,
            priority: "CRITICAL",
            title: "Réception d'une notification push",
            module: "Messagerie",
            objective:
              "Vérifier que la notification push est reçue lors d'un nouveau message.",
            preconditions:
              "L'app est en arrière-plan. Les notifications push sont activées.",
            steps: [
              "Un autre utilisateur envoie un message",
              "Observer l'écran de verrouillage",
            ],
            expectedResult:
              "Une notification push apparaît avec l'expéditeur et le début du message.",
            evidenceRequired: true,
          },
          {
            ...caseShared,
            orderIndex: 2,
            priority: "MEDIUM",
            title: "Pièce jointe image",
            module: "Messagerie",
            objective:
              "Vérifier l'envoi et l'affichage d'une pièce jointe image.",
            preconditions: "Être dans une conversation existante.",
            steps: [
              "Composer un message",
              "Appuyer sur l'icône pièce jointe",
              "Sélectionner une image depuis la galerie",
              "Envoyer",
            ],
            expectedResult:
              "L'image est affichée dans le fil du message côté expéditeur et destinataire.",
            evidenceRequired: true,
          },
        ],
      },
    },
  });
  console.log(`✅ Campagne créée : ${c1.title}`);

  // Campagne 2 — Notes & Évaluations
  const c2 = await prisma.testCampaign.create({
    data: {
      ...campaignShared,
      title: "Recette mobile v1.4 — Notes & Évaluations",
      description:
        "Validation du module Notes et du flux de saisie des évaluations.",
      targetVersion: "1.4",
      status: "ACTIVE",
      dueAt: new Date("2026-07-15T00:00:00.000Z"),
      testCases: {
        create: [
          {
            ...caseShared,
            orderIndex: 0,
            priority: "HIGH",
            title: "Consultation des notes (parent)",
            module: "Notes",
            objective:
              "Vérifier qu'un parent peut consulter les notes de son enfant.",
            preconditions:
              "Être connecté en tant que parent avec un élève inscrit dans une classe.",
            steps: [
              "Ouvrir le module Notes",
              "Sélectionner l'enfant",
              "Vérifier l'affichage des matières et moyennes",
            ],
            expectedResult:
              "Les notes et moyennes sont affichées correctement pour chaque matière.",
            evidenceRequired: false,
          },
          {
            ...caseShared,
            orderIndex: 1,
            priority: "HIGH",
            title: "Création d'une évaluation (enseignant)",
            module: "Notes",
            objective:
              "Vérifier qu'un enseignant peut créer une évaluation pour sa classe.",
            preconditions:
              "Être connecté en tant qu'enseignant affecté à au moins une classe.",
            steps: [
              "Ouvrir le module Notes",
              "Sélectionner une classe",
              "Appuyer sur + Évaluation",
              "Remplir le titre, la matière et le barème",
              "Enregistrer",
            ],
            expectedResult:
              "L'évaluation apparaît dans la liste avec le statut BROUILLON.",
            evidenceRequired: false,
            audienceRoles: {
              create: [{ role: "TEACHER" }, { role: "SCHOOL_ADMIN" }],
            },
          },
          {
            ...caseShared,
            orderIndex: 2,
            priority: "CRITICAL",
            title: "Saisie des notes d'une évaluation",
            module: "Notes",
            objective:
              "Vérifier la saisie des notes pour chaque élève d'une évaluation.",
            preconditions:
              "Une évaluation existe en statut BROUILLON ou EN_COURS.",
            steps: [
              "Ouvrir l'évaluation",
              "Saisir une note pour chaque élève",
              "Enregistrer",
            ],
            expectedResult:
              "Les notes sont sauvegardées et visibles dans la liste de l'évaluation.",
            evidenceRequired: true,
            audienceRoles: {
              create: [{ role: "TEACHER" }, { role: "SCHOOL_ADMIN" }],
            },
          },
          {
            ...caseShared,
            orderIndex: 3,
            priority: "MEDIUM",
            title: "Conseil de classe",
            module: "Notes",
            objective: "Vérifier l'accès et la saisie du conseil de classe.",
            preconditions: "Des notes existent pour la classe et la période.",
            steps: [
              "Ouvrir le module Notes",
              "Sélectionner une classe",
              "Appuyer sur Conseil de classe",
              "Saisir des appréciations et valider",
            ],
            expectedResult:
              "Les appréciations sont enregistrées et la période est marquée finalisée.",
            evidenceRequired: true,
            audienceRoles: {
              create: [{ role: "TEACHER" }, { role: "SCHOOL_ADMIN" }],
            },
          },
        ],
      },
    },
  });
  console.log(`✅ Campagne créée : ${c2.title}`);

  // Campagne 3 — Smoke test Auth (DRAFT — non visible dans le mobile)
  const c3 = await prisma.testCampaign.create({
    data: {
      ...campaignShared,
      title: "Smoke test — Authentification",
      description:
        "Vérifications rapides des flux de connexion (en préparation).",
      targetVersion: "1.4",
      status: "DRAFT",
      testCases: {
        create: [
          {
            ...caseShared,
            orderIndex: 0,
            priority: "CRITICAL",
            title: "Connexion par email",
            module: "Auth",
            objective: "Vérifier la connexion avec email + mot de passe.",
            steps: [
              "Ouvrir l'app",
              "Sélectionner l'onglet Email",
              "Saisir email et mot de passe valides",
              "Appuyer sur Se connecter",
            ],
            expectedResult: "L'utilisateur arrive sur l'écran principal.",
            evidenceRequired: false,
          },
          {
            ...caseShared,
            orderIndex: 1,
            priority: "HIGH",
            title: "Connexion par téléphone + PIN",
            module: "Auth",
            objective: "Vérifier la connexion avec numéro de téléphone et PIN.",
            steps: [
              "Ouvrir l'app",
              "Sélectionner l'onglet Téléphone",
              "Saisir le numéro et le PIN",
              "Appuyer sur Se connecter",
            ],
            expectedResult: "L'utilisateur arrive sur l'écran principal.",
            evidenceRequired: false,
          },
        ],
      },
    },
  });
  console.log(`✅ Campagne créée (DRAFT) : ${c3.title}`);

  console.log("\nDone. 2 campagnes ACTIVE + 1 DRAFT dans college-vogt.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
