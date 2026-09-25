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
const PARENT_PHONE = "+237689068887";
const STUDENT_FIRST_NAME = "Romaric";
const STUDENT_LAST_NAME = "Pistone";
const CLASS_NAME = "6e C";

function daysAgo(days, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const school = await prisma.school.findUnique({
    where: { slug: SCHOOL_SLUG },
    select: { id: true },
  });
  if (!school) {
    throw new Error(`School ${SCHOOL_SLUG} not found`);
  }

  const parent = await prisma.user.findFirst({
    where: { phone: PARENT_PHONE },
    select: { id: true },
  });
  if (!parent) {
    throw new Error(`Parent with phone ${PARENT_PHONE} not found`);
  }

  const manager = await prisma.user.findFirst({
    where: {
      firstName: "Emma",
      lastName: "MBELE",
      memberships: { some: { schoolId: school.id, role: "SCHOOL_ADMIN" } },
    },
    select: { id: true },
  });
  if (!manager) {
    throw new Error(`School admin Emma MBELE not found at ${SCHOOL_SLUG}`);
  }

  const referentTeacher = await prisma.user.findFirst({
    where: {
      firstName: "Anne",
      lastName: "Rousselot",
      memberships: { some: { schoolId: school.id, role: "TEACHER" } },
    },
    select: { id: true },
  });
  if (!referentTeacher) {
    throw new Error(`Teacher Anne Rousselot not found at ${SCHOOL_SLUG}`);
  }

  const secondTeacher = await prisma.user.findFirst({
    where: {
      firstName: "William",
      lastName: "Tagal",
      memberships: { some: { schoolId: school.id, role: "TEACHER" } },
    },
    select: { id: true },
  });
  if (!secondTeacher) {
    throw new Error(`Teacher William Tagal not found at ${SCHOOL_SLUG}`);
  }

  const student = await prisma.student.findFirst({
    where: {
      schoolId: school.id,
      firstName: STUDENT_FIRST_NAME,
      lastName: STUDENT_LAST_NAME,
    },
    select: { id: true },
  });
  if (!student) {
    throw new Error(
      `Student ${STUDENT_FIRST_NAME} ${STUDENT_LAST_NAME} not found at ${SCHOOL_SLUG}`,
    );
  }

  const classRoom = await prisma.class.findFirst({
    where: { schoolId: school.id, name: CLASS_NAME },
    select: { id: true, academicLevelId: true },
  });
  if (!classRoom) {
    throw new Error(`Class ${CLASS_NAME} not found at ${SCHOOL_SLUG}`);
  }

  // --- Cleanup previous demo data for this parent (idempotent re-run) ---
  const previousMessages = await prisma.internalMessage.findMany({
    where: {
      schoolId: school.id,
      OR: [
        { senderUserId: parent.id },
        { recipients: { some: { recipientUserId: parent.id } } },
      ],
    },
    select: { id: true },
  });
  const previousMessageIds = previousMessages.map((m) => m.id);
  if (previousMessageIds.length) {
    await prisma.internalMessageAttachment.deleteMany({
      where: { messageId: { in: previousMessageIds } },
    });
    await prisma.internalMessageRecipient.deleteMany({
      where: { messageId: { in: previousMessageIds } },
    });
    await prisma.internalMessage.deleteMany({
      where: { id: { in: previousMessageIds } },
    });
  }

  const previousFeedLikes = await prisma.feedLike.deleteMany({
    where: { schoolId: school.id, userId: parent.id },
  });
  const previousFeedComments = await prisma.feedComment.deleteMany({
    where: { schoolId: school.id, authorUserId: parent.id },
  });

  // ------------------------- MAILS (InternalMessage) -------------------------

  const messages = [
    {
      senderUserId: manager.id,
      subject: "Bienvenue au Lycée du Poisson d'Avril",
      body: "<p>Bonjour,</p><p>Nous sommes ravis d'accueillir Romaric dans notre établissement. N'hésitez pas à nous contacter par ce canal pour toute question administrative ou pédagogique.</p><p>Bien cordialement,<br/>Emma MBELE — Direction</p>",
      sentAt: daysAgo(60, 9, 0),
      recipientUserId: parent.id,
    },
    {
      senderUserId: referentTeacher.id,
      subject: "Réunion parents-professeurs — 6e C",
      body: "<p>Bonjour,</p><p>La réunion parents-professeurs de la classe de 6e C aura lieu le jeudi 15 octobre à 17h30 en salle 12. Votre présence est vivement souhaitée pour faire le point sur le début d'année de Romaric.</p><p>Cordialement,<br/>Anne Rousselot — Professeure principale</p>",
      sentAt: daysAgo(52, 8, 30),
      recipientUserId: parent.id,
    },
    {
      senderUserId: parent.id,
      subject: "Re: Réunion parents-professeurs — 6e C",
      body: "<p>Bonjour Madame Rousselot,</p><p>Merci pour l'information, je serai présent à la réunion du 15 octobre.</p><p>Cordialement,<br/>Le père de Romaric</p>",
      sentAt: daysAgo(51, 19, 10),
      recipientUserId: referentTeacher.id,
    },
    {
      senderUserId: secondTeacher.id,
      subject: "Absence non justifiée — 12 août",
      body: "<p>Bonjour,</p><p>Nous avons noté l'absence de Romaric ce matin en cours de mathématiques sans justificatif transmis. Pourriez-vous régulariser sa situation via un mot d'excuse ou nous préciser le motif ?</p><p>Merci,<br/>William Tagal</p>",
      sentAt: daysAgo(35, 10, 0),
      recipientUserId: parent.id,
    },
    {
      senderUserId: parent.id,
      subject: "Re: Absence non justifiée — 12 août",
      body: "<p>Bonjour,</p><p>Toutes mes excuses pour le retard. Romaric avait un rendez-vous médical ce matin-là (contrôle de son asthme). Je joins le certificat médical.</p><p>Cordialement</p>",
      sentAt: daysAgo(34, 20, 45),
      recipientUserId: secondTeacher.id,
    },
    {
      senderUserId: manager.id,
      subject: "Rappel — Sortie scolaire du 3 septembre",
      body: "<p>Bonjour,</p><p>Nous vous rappelons que la sortie pédagogique au musée national aura lieu le mercredi 3 septembre. Merci de bien vouloir signer et retourner l'autorisation de sortie avant le 30 août.</p><p>Bien cordialement,<br/>Direction</p>",
      sentAt: daysAgo(20, 8, 0),
      recipientUserId: parent.id,
    },
    {
      senderUserId: referentTeacher.id,
      subject: "Point sur le trimestre — Romaric",
      body: "<p>Bonjour,</p><p>Romaric a fourni un bon trimestre, en particulier en français et en histoire-géographie. Une attention est à porter sur les mathématiques où quelques lacunes apparaissent sur les fractions. Je reste disponible pour en discuter.</p><p>Cordialement,<br/>Anne Rousselot</p>",
      sentAt: daysAgo(9, 16, 20),
      recipientUserId: parent.id,
    },
    {
      senderUserId: parent.id,
      subject: "Demande de rendez-vous",
      body: "<p>Bonjour Madame Rousselot,</p><p>Suite à votre message sur les mathématiques, seriez-vous disponible pour un court rendez-vous la semaine prochaine ? Je souhaiterais aussi évoquer l'organisation liée à son allergie alimentaire à la cantine.</p><p>Merci d'avance,<br/>Le père de Romaric</p>",
      sentAt: daysAgo(8, 21, 5),
      recipientUserId: referentTeacher.id,
    },
    {
      senderUserId: referentTeacher.id,
      subject: "Re: Demande de rendez-vous",
      body: "<p>Bonjour,</p><p>Bien sûr, je vous propose mardi prochain à 17h en salle des professeurs. N'hésitez pas à confirmer par retour.</p><p>Cordialement,<br/>Anne Rousselot</p>",
      sentAt: daysAgo(7, 8, 10),
      recipientUserId: parent.id,
    },
    {
      senderUserId: manager.id,
      subject: "Facture de scolarité — 2e trimestre",
      body: "<p>Bonjour,</p><p>Veuillez trouver ci-joint la facture de scolarité du 2e trimestre. Merci de bien vouloir procéder au règlement avant le 30 du mois.</p><p>Bien cordialement,<br/>Service comptabilité</p>",
      sentAt: daysAgo(3, 9, 30),
      recipientUserId: parent.id,
    },
  ];

  for (const m of messages) {
    await prisma.internalMessage.create({
      data: {
        schoolId: school.id,
        senderUserId: m.senderUserId,
        status: "SENT",
        subject: m.subject,
        body: m.body,
        sentAt: m.sentAt,
        recipients: {
          create: {
            schoolId: school.id,
            recipientUserId: m.recipientUserId,
            readAt:
              m.recipientUserId === parent.id && Math.random() > 0.3
                ? new Date(m.sentAt.getTime() + 1000 * 60 * 45)
                : null,
          },
        },
      },
    });
  }

  console.log(
    `Seeded ${messages.length} internal messages for parent ${parent.id}.`,
  );

  // ------------------------- FIL (FeedPost) -------------------------

  const posts = [
    {
      authorUserId: manager.id,
      type: "POST",
      title: "Rentrée scolaire 2026",
      bodyHtml:
        "<p>Toute l'équipe pédagogique est heureuse d'accueillir élèves et familles pour cette nouvelle année scolaire. Bonne rentrée à tous !</p>",
      audienceScope: "SCHOOL_ALL",
      audienceLabel: "Toute l'école",
      createdAt: daysAgo(58, 7, 30),
    },
    {
      authorUserId: referentTeacher.id,
      type: "POST",
      title: "Fournitures scolaires manquantes",
      bodyHtml:
        "<p>Merci de vérifier que chaque élève de 6e C dispose bien de son matériel de géométrie complet pour la rentrée des cours de mathématiques.</p>",
      audienceScope: "CLASS",
      audienceLabel: CLASS_NAME,
      audienceClassId: classRoom.id,
      createdAt: daysAgo(49, 14, 0),
    },
    {
      authorUserId: manager.id,
      type: "POLL",
      title: "Sondage — Horaire de la kermesse de fin d'année",
      bodyHtml:
        "<p>Aidez-nous à choisir le meilleur horaire pour la kermesse de fin d'année.</p>",
      audienceScope: "PARENTS_ONLY",
      audienceLabel: "Parents",
      pollQuestion: "Quel horaire préférez-vous pour la kermesse ?",
      pollOptionsJson: [
        { id: "opt1", label: "Samedi matin" },
        { id: "opt2", label: "Samedi après-midi" },
        { id: "opt3", label: "Dimanche après-midi" },
      ],
      createdAt: daysAgo(30, 11, 0),
    },
    {
      authorUserId: referentTeacher.id,
      type: "POST",
      title: "Sortie pédagogique au musée national",
      bodyHtml:
        "<p>La classe de 6e C se rendra au musée national le mercredi 3 septembre. Départ à 8h, retour prévu à 16h. Prévoir un pique-nique.</p>",
      audienceScope: "CLASS",
      audienceLabel: CLASS_NAME,
      audienceClassId: classRoom.id,
      createdAt: daysAgo(22, 9, 0),
    },
    {
      authorUserId: manager.id,
      type: "POST",
      title: "Vigilance allergies alimentaires à la cantine",
      bodyHtml:
        "<p>Nous rappelons aux familles concernées par une allergie alimentaire déclarée de bien transmettre le protocole d'accueil individualisé (PAI) au secrétariat afin d'assurer un suivi optimal à la cantine.</p>",
      audienceScope: "PARENTS_ONLY",
      audienceLabel: "Parents",
      createdAt: daysAgo(6, 12, 15),
    },
    {
      authorUserId: referentTeacher.id,
      type: "POST",
      title: "Bilan du 1er trimestre — 6e C",
      bodyHtml:
        "<p>Les bulletins du premier trimestre sont désormais disponibles dans l'espace parents. N'hésitez pas à me contacter pour tout échange complémentaire.</p>",
      audienceScope: "CLASS",
      audienceLabel: CLASS_NAME,
      audienceClassId: classRoom.id,
      createdAt: daysAgo(2, 17, 45),
    },
  ];

  const createdPosts = [];
  for (const p of posts) {
    const created = await prisma.feedPost.create({
      data: {
        schoolId: school.id,
        authorUserId: p.authorUserId,
        type: p.type,
        title: p.title,
        bodyHtml: p.bodyHtml,
        audienceScope: p.audienceScope,
        audienceLabel: p.audienceLabel,
        audienceClassId: p.audienceClassId ?? null,
        pollQuestion: p.pollQuestion ?? null,
        pollOptionsJson: p.pollOptionsJson ?? undefined,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
      },
      select: { id: true, audienceScope: true },
    });
    createdPosts.push(created);
  }

  console.log(`Seeded ${createdPosts.length} feed posts.`);

  // Parent engagement: likes + comments on posts visible to them (school-wide, parents, or their child's class)
  const visiblePosts = createdPosts.filter((p) =>
    ["SCHOOL_ALL", "PARENTS_ONLY", "PARENTS_STUDENTS", "CLASS"].includes(
      p.audienceScope,
    ),
  );

  for (const post of visiblePosts) {
    await prisma.feedLike.create({
      data: {
        postId: post.id,
        schoolId: school.id,
        userId: parent.id,
      },
    });
  }

  const parentComments = [
    {
      postIndex: 1, // Fournitures scolaires
      text: "Merci pour le rappel, c'est noté, tout est complet de notre côté.",
    },
    {
      postIndex: 3, // Sortie pédagogique
      text: "Bonjour, faut-il prévoir une autorisation de sortie signée en plus du pique-nique ?",
    },
    {
      postIndex: 4, // Vigilance allergies
      text: "Le PAI de Romaric a déjà été transmis au secrétariat en début d'année, merci de vérifier qu'il est bien à jour de votre côté.",
    },
  ];

  for (const c of parentComments) {
    const post = createdPosts[c.postIndex];
    if (!post) continue;
    await prisma.feedComment.create({
      data: {
        postId: post.id,
        schoolId: school.id,
        authorUserId: parent.id,
        text: c.text,
      },
    });
  }

  console.log(
    `Seeded ${visiblePosts.length} likes and ${parentComments.length} comments from parent ${parent.id}.`,
  );

  if (
    previousMessageIds.length ||
    previousFeedLikes.count ||
    previousFeedComments.count
  ) {
    console.log(
      `Cleaned up previous demo data: ${previousMessageIds.length} messages, ${previousFeedLikes.count} likes, ${previousFeedComments.count} comments.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
