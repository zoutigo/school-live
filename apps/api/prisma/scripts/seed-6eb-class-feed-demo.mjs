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

const SCHOOL_ID = "cmlsm7wgp0004mu0isxikgdz7"; // Lycée du Poisson d'Avril
const CLASS_ID = "cmlte87s6001ans0ioihwxbnj"; // 6e B
const LEVEL_ID = "cmrgg7k6h000dnv6tnnvo84sc";

const EMMA_MBELE = "cmlsm7wh80005mu0iz1v7lw3p"; // Maths
const GALLICE_TALLA = "cmo62ivo1003cl70i93znwnir"; // Geo
const VIVIANE_FOPA = "cms3lot030009qi0ijo65yhi9"; // Français
const ANNE_MARIE_LEUGEU = "cmr31lugw002hrp0juzuf0sr2"; // Anglais
const WILLIAM_TAGAL = "cmr4sgftj0000mb0j8ygala5e"; // Arts
const FOTSING = "cmlten0dq0027ns0il3ohmupv"; // Histoire

const NINA_USER = "cmt09uncq0066li0igzcels8j";
const MARIE_USER = "cmt0adv3z006oli0iju7no5bp";

function iso(dateStr) {
  return new Date(dateStr);
}

const POSTS = [
  {
    type: "POST",
    authorUserId: EMMA_MBELE,
    title: "Rappel : révisions pour la rentrée",
    bodyHtml:
      "<p>Bonjour à tous,</p><p>Pensez à revoir les fractions et la proportionnalité avant le devoir du 31 août. N'hésitez pas à poser vos questions ici.</p>",
    createdAt: "2026-08-05T08:00:00Z",
  },
  {
    type: "POST",
    authorUserId: GALLICE_TALLA,
    title: "Sortie pédagogique – Musée d'Histoire Naturelle",
    bodyHtml:
      "<p>La sortie au musée est confirmée pour le 3 septembre.</p><p>Merci de rapporter l'autorisation signée avant vendredi.</p>",
    createdAt: "2026-08-10T09:30:00Z",
  },
  {
    type: "POLL",
    authorUserId: VIVIANE_FOPA,
    title: "Choix du prochain livre de lecture suivie",
    bodyHtml:
      "<p>Merci de voter pour le livre que la classe étudiera au prochain trimestre.</p>",
    pollQuestion: "Quel livre souhaitez-vous étudier ?",
    pollOptions: [
      "Le Petit Prince",
      "Contes du Cameroun",
      "Vingt mille lieues sous les mers",
    ],
    createdAt: "2026-08-12T10:00:00Z",
  },
  {
    type: "POST",
    authorUserId: NINA_USER,
    title: "Résumé du cours d'histoire",
    bodyHtml:
      "<p>Salut tout le monde, quelqu'un a-t-il un résumé clair du dernier cours d'histoire sur la préhistoire ? Je veux compléter mes notes avant le devoir.</p>",
    createdAt: "2026-08-14T17:00:00Z",
  },
  {
    type: "POST",
    authorUserId: MARIE_USER,
    title: "Merci pour l'aide en maths",
    bodyHtml:
      "<p>Merci à Madame MBELE et aux camarades qui m'ont aidée à comprendre les fractions cette semaine, ça va beaucoup mieux !</p>",
    createdAt: "2026-08-16T18:00:00Z",
  },
  {
    type: "POLL",
    authorUserId: WILLIAM_TAGAL,
    title: "Choix du thème du prochain projet artistique",
    bodyHtml:
      "<p>Votez pour le thème du prochain projet créatif en arts plastiques.</p>",
    pollQuestion: "Quel thème préférez-vous ?",
    pollOptions: ["Le portrait", "Le paysage camerounais", "L'art abstrait"],
    createdAt: "2026-08-18T09:00:00Z",
  },
  {
    type: "POST",
    authorUserId: ANNE_MARIE_LEUGEU,
    title: "Bravo pour l'oral d'anglais",
    bodyHtml:
      "<p>Toute la classe a bien progressé sur l'oral de dialogue en anglais, continuez à pratiquer à la maison !</p>",
    createdAt: "2026-08-19T11:00:00Z",
  },
  {
    type: "POST",
    authorUserId: FOTSING,
    title: "Correction du devoir d'histoire disponible",
    bodyHtml:
      "<p>La correction du devoir sur la préhistoire est affichée au tableau de la classe, pensez à la recopier dans votre cahier.</p>",
    createdAt: "2026-08-20T13:00:00Z",
  },
];

const COMMENTS_BY_TITLE = {
  "Rappel : révisions pour la rentrée": [
    {
      authorUserId: NINA_USER,
      text: "Merci Madame, je vais reprendre les exercices ce week-end.",
      createdAt: "2026-08-05T19:00:00Z",
    },
    {
      authorUserId: MARIE_USER,
      text: "Est-ce que la fiche de révision sera partagée aussi ?",
      createdAt: "2026-08-06T08:00:00Z",
    },
  ],
  "Sortie pédagogique – Musée d'Histoire Naturelle": [
    {
      authorUserId: MARIE_USER,
      text: "Super, j'ai hâte !",
      createdAt: "2026-08-10T18:00:00Z",
    },
  ],
  "Résumé du cours d'histoire": [
    {
      authorUserId: MARIE_USER,
      text: "Je peux te passer mes notes demain matin.",
      createdAt: "2026-08-14T18:30:00Z",
    },
    {
      authorUserId: FOTSING,
      text: "Bonne initiative de vous entraider, la correction sera aussi affichée en classe.",
      createdAt: "2026-08-15T07:00:00Z",
    },
  ],
  "Merci pour l'aide en maths": [
    {
      authorUserId: EMMA_MBELE,
      text: "Bravo Marie, continue comme ça !",
      createdAt: "2026-08-16T19:00:00Z",
    },
    {
      authorUserId: NINA_USER,
      text: "Bien joué Marie !",
      createdAt: "2026-08-17T07:00:00Z",
    },
  ],
  "Bravo pour l'oral d'anglais": [
    {
      authorUserId: NINA_USER,
      text: "Merci Madame, c'était stressant mais on a bien travaillé !",
      createdAt: "2026-08-19T18:00:00Z",
    },
  ],
};

async function main() {
  const created = [];
  for (const post of POSTS) {
    const pollOptions =
      post.type === "POLL"
        ? post.pollOptions.map((label, idx) => ({
            id: `opt-${idx + 1}`,
            label,
            votes: 0,
          }))
        : undefined;

    const row = await prisma.feedPost.create({
      data: {
        schoolId: SCHOOL_ID,
        authorUserId: post.authorUserId,
        type: post.type,
        title: post.title,
        bodyHtml: post.bodyHtml,
        audienceScope: "CLASS",
        audienceLabel: "6e B",
        audienceLevelId: LEVEL_ID,
        audienceClassId: CLASS_ID,
        pollQuestion: post.type === "POLL" ? post.pollQuestion : null,
        pollOptionsJson: pollOptions,
        createdAt: iso(post.createdAt),
      },
      select: { id: true, title: true, type: true },
    });
    created.push({ ...row, pollOptions });
  }

  let commentCount = 0;
  for (const entry of created) {
    const comments = COMMENTS_BY_TITLE[entry.title] ?? [];
    for (const comment of comments) {
      await prisma.feedComment.create({
        data: {
          postId: entry.id,
          schoolId: SCHOOL_ID,
          authorUserId: comment.authorUserId,
          text: comment.text,
          createdAt: iso(comment.createdAt),
        },
      });
      commentCount += 1;
    }
  }

  const likers = [
    NINA_USER,
    MARIE_USER,
    EMMA_MBELE,
    GALLICE_TALLA,
    VIVIANE_FOPA,
    ANNE_MARIE_LEUGEU,
    WILLIAM_TAGAL,
    FOTSING,
  ];
  let likeCount = 0;
  for (const entry of created) {
    for (const userId of likers) {
      if (userId === entry.authorUserId) continue;
      await prisma.feedLike.upsert({
        where: { postId_userId: { postId: entry.id, userId } },
        update: {},
        create: { postId: entry.id, schoolId: SCHOOL_ID, userId },
      });
      likeCount += 1;
    }
  }

  let voteCount = 0;
  for (const entry of created) {
    if (entry.type !== "POLL" || !entry.pollOptions) continue;
    const voters = [
      NINA_USER,
      MARIE_USER,
      EMMA_MBELE,
      GALLICE_TALLA,
      FOTSING,
    ].filter((userId) => userId !== entry.authorUserId);
    const voteCounts = entry.pollOptions.map((option) => ({
      ...option,
      votes: 0,
    }));
    for (const [idx, voterId] of voters.entries()) {
      const option = voteCounts[idx % voteCounts.length];
      option.votes += 1;
      await prisma.feedPollVote.upsert({
        where: { postId_userId: { postId: entry.id, userId: voterId } },
        update: { optionId: option.id },
        create: {
          postId: entry.id,
          schoolId: SCHOOL_ID,
          userId: voterId,
          optionId: option.id,
        },
      });
      voteCount += 1;
    }
    await prisma.feedPost.update({
      where: { id: entry.id },
      data: { pollOptionsJson: voteCounts },
    });
  }

  console.log(
    JSON.stringify(
      { postsCreated: created.length, commentCount, likeCount, voteCount },
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
