import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Unlike most seed-*.mjs scripts here, this one is meant to run in every
// environment including production: it seeds the real initial content for
// the public marketing site (contact info + legal pages), not dev fixtures.
// It is deliberately idempotent and non-destructive: it only fills in a row
// when nothing exists yet, so it never overwrites content an admin already
// edited through /site-contenu.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const CONTACT_INFO = {
  email: "contact@scolive.cm",
  phone: "+237 6XX XXX XXX",
  address: "Cameroun",
};

function sectionsToHtml(intro, sections) {
  const sectionsHtml = sections
    .map((section) => `<h2>${section.heading}</h2><p>${section.body}</p>`)
    .join("");
  return `<p>${intro}</p>${sectionsHtml}`;
}

const LEGAL_DOCUMENTS = [
  {
    slug: "cgu",
    locale: "fr",
    title: "Conditions générales d'utilisation",
    contentHtml: sectionsToHtml(
      "Les présentes CGU définissent les règles d'utilisation de la plateforme Scolive par les écoles, enseignants et familles.",
      [
        {
          heading: "Objet",
          body: "Scolive est une plateforme de gestion de la vie scolaire (notes, emploi du temps, devoirs, communication) destinée aux écoles, à leurs enseignants et aux familles.",
        },
        {
          heading: "Accès au service",
          body: "L'accès à Scolive se fait via un compte créé par l'établissement scolaire. Chaque utilisateur est responsable de la confidentialité de ses identifiants.",
        },
        {
          heading: "Comptes et rôles",
          body: "Les droits d'accès varient selon le rôle (administration, enseignant, parent, élève) et sont définis par l'établissement.",
        },
        {
          heading: "Utilisation autorisée",
          body: "Le service doit être utilisé conformément à sa destination pédagogique et administrative, dans le respect des autres utilisateurs.",
        },
        {
          heading: "Responsabilités",
          body: "Scolive fournit l'outil ; les établissements restent responsables de l'exactitude des informations qu'ils y publient.",
        },
        {
          heading: "Modification des CGU et droit applicable",
          body: "Ces CGU peuvent évoluer ; les utilisateurs seront informés des changements. Elles sont soumises au droit camerounais.",
        },
      ],
    ),
  },
  {
    slug: "cgu",
    locale: "en",
    title: "Terms of service",
    contentHtml: sectionsToHtml(
      "These terms define how schools, teachers and families may use the Scolive platform.",
      [
        {
          heading: "Purpose",
          body: "Scolive is a school life management platform (grades, timetable, homework, communication) for schools, their teachers and families.",
        },
        {
          heading: "Access to the service",
          body: "Access to Scolive is granted through an account created by the school. Each user is responsible for keeping their credentials confidential.",
        },
        {
          heading: "Accounts and roles",
          body: "Access rights vary by role (administration, teacher, parent, student) and are defined by the school.",
        },
        {
          heading: "Permitted use",
          body: "The service must be used for its intended educational and administrative purpose, with respect for other users.",
        },
        {
          heading: "Responsibilities",
          body: "Scolive provides the tool; schools remain responsible for the accuracy of the information they publish on it.",
        },
        {
          heading: "Changes to these terms and governing law",
          body: "These terms may evolve; users will be informed of changes. They are governed by the laws of Cameroon.",
        },
      ],
    ),
  },
  {
    slug: "mentions-legales",
    locale: "fr",
    title: "Mentions légales",
    contentHtml: sectionsToHtml(
      "Informations relatives à l'édition et à l'hébergement de la plateforme Scolive.",
      [
        {
          heading: "Éditeur du site",
          body: "Scolive est édité par [Raison sociale à compléter], [forme juridique], dont le siège social est situé au Cameroun. Contact : contact@scolive.cm.",
        },
        {
          heading: "Hébergement",
          body: "La plateforme est hébergée par OVH SAS, 2 rue Kellermann, 59100 Roubaix, France.",
        },
        {
          heading: "Propriété intellectuelle",
          body: "L'ensemble des contenus, marques et éléments graphiques de Scolive sont protégés et ne peuvent être reproduits sans autorisation.",
        },
        {
          heading: "Responsabilité",
          body: "Scolive met tout en œuvre pour assurer la disponibilité et l'exactitude des informations, sans garantie d'absence d'erreur ou d'interruption du service.",
        },
        {
          heading: "Droit applicable",
          body: "Les présentes mentions légales sont soumises au droit camerounais.",
        },
      ],
    ),
  },
  {
    slug: "mentions-legales",
    locale: "en",
    title: "Legal notice",
    contentHtml: sectionsToHtml(
      "Information about the publisher and hosting of the Scolive platform.",
      [
        {
          heading: "Publisher",
          body: "Scolive is published by [Company name to complete], [legal form], headquartered in Cameroon. Contact: contact@scolive.cm.",
        },
        {
          heading: "Hosting",
          body: "The platform is hosted by OVH SAS, 2 rue Kellermann, 59100 Roubaix, France.",
        },
        {
          heading: "Intellectual property",
          body: "All Scolive content, trademarks and graphic elements are protected and may not be reproduced without authorisation.",
        },
        {
          heading: "Liability",
          body: "Scolive strives to keep information accurate and available, without guaranteeing an error-free or uninterrupted service.",
        },
        {
          heading: "Governing law",
          body: "This legal notice is governed by the laws of Cameroon.",
        },
      ],
    ),
  },
  {
    slug: "confidentialite",
    locale: "fr",
    title: "Politique de confidentialité",
    contentHtml: sectionsToHtml(
      "Comment Scolive collecte, utilise et protège les données personnelles des écoles, enseignants et familles.",
      [
        {
          heading: "Données collectées",
          body: "Nom, contact, rôle et données de scolarité (notes, absences, messages) nécessaires au fonctionnement de la plateforme.",
        },
        {
          heading: "Finalités du traitement",
          body: "Ces données sont utilisées uniquement pour assurer le suivi scolaire, la communication école-famille et le bon fonctionnement du service.",
        },
        {
          heading: "Partage des données",
          body: "Les données ne sont jamais revendues. Elles ne sont partagées qu'avec les acteurs nécessaires au fonctionnement du service (hébergement, envoi d'emails).",
        },
        {
          heading: "Sécurité et hébergement",
          body: "Les données sont hébergées sur des serveurs sécurisés (OVH) avec des mesures techniques adaptées pour en limiter l'accès.",
        },
        {
          heading: "Droits des utilisateurs",
          body: "Chaque utilisateur peut demander l'accès, la rectification ou la suppression de ses données en nous contactant via la page Contact.",
        },
        {
          heading: "Conservation des données",
          body: "Les données sont conservées pendant la durée de la scolarité de l'élève et selon les obligations légales applicables.",
        },
      ],
    ),
  },
  {
    slug: "confidentialite",
    locale: "en",
    title: "Privacy policy",
    contentHtml: sectionsToHtml(
      "How Scolive collects, uses and protects personal data of schools, teachers and families.",
      [
        {
          heading: "Data collected",
          body: "Name, contact details, role and school data (grades, absences, messages) needed to operate the platform.",
        },
        {
          heading: "Purpose of processing",
          body: "This data is used only to support academic follow-up, school-family communication and the proper functioning of the service.",
        },
        {
          heading: "Data sharing",
          body: "Data is never sold. It is only shared with parties necessary to operate the service (hosting, email delivery).",
        },
        {
          heading: "Security and hosting",
          body: "Data is hosted on secure servers (OVH) with technical measures in place to limit access.",
        },
        {
          heading: "User rights",
          body: "Every user can request access to, correction of, or deletion of their data by reaching out via the Contact page.",
        },
        {
          heading: "Data retention",
          body: "Data is kept for the duration of the student's enrolment and in line with applicable legal obligations.",
        },
      ],
    ),
  },
];

async function main() {
  const actor =
    (await prisma.user.findFirst({
      where: {
        platformRoles: {
          some: { role: "SUPER_ADMIN" },
        },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    })) ||
    (await prisma.user.findFirst({
      select: { id: true },
      orderBy: { createdAt: "asc" },
    }));

  const existingContact = await prisma.siteSetting.findUnique({
    where: { key: "contact" },
  });
  if (existingContact) {
    console.log("SiteSetting 'contact' already exists — skipped.");
  } else {
    await prisma.siteSetting.create({
      data: {
        key: "contact",
        value: CONTACT_INFO,
        updatedById: actor?.id ?? null,
      },
    });
    console.log("SiteSetting 'contact' seeded.");
  }

  if (!actor) {
    console.log(
      "Aucun utilisateur en base : documents légaux non seedés (aucun createdBy/updatedBy disponible). Relancer ce script après la création du premier compte.",
    );
    await prisma.$disconnect();
    return;
  }

  for (const doc of LEGAL_DOCUMENTS) {
    const existing = await prisma.legalDocument.findFirst({
      where: { slug: doc.slug, locale: doc.locale },
    });
    if (existing) {
      console.log(
        `LegalDocument ${doc.slug}/${doc.locale} already exists — skipped.`,
      );
      continue;
    }

    await prisma.legalDocument.create({
      data: {
        slug: doc.slug,
        locale: doc.locale,
        title: doc.title,
        contentHtml: doc.contentHtml,
        version: 1,
        status: "PUBLISHED",
        publishedAt: new Date(),
        createdById: actor.id,
        updatedById: actor.id,
      },
    });
    console.log(
      `LegalDocument ${doc.slug}/${doc.locale} seeded (v1, PUBLISHED).`,
    );
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
