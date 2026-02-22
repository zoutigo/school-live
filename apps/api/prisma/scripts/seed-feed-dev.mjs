import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();
const SEED_PREFIX = "[DEV_FEED_SEED]";

function pickOne(list, fallback = null) {
  return list.length > 0
    ? list[Math.floor(Math.random() * list.length)]
    : fallback;
}

function randomSubset(list, max = 4) {
  const clone = [...list];
  const picked = [];
  const count = Math.min(max, Math.max(1, Math.floor(Math.random() * max) + 1));
  while (clone.length > 0 && picked.length < count) {
    const idx = Math.floor(Math.random() * clone.length);
    picked.push(clone.splice(idx, 1)[0]);
  }
  return picked;
}

function audienceLabel(scope, className, levelLabel) {
  if (scope === "STAFF_ONLY") return "Staff uniquement";
  if (scope === "PARENTS_STUDENTS") return "Parents et eleves (ecole)";
  if (scope === "PARENTS_ONLY") return "Parents uniquement";
  if (scope === "CLASS")
    return `Parents/eleves classe ${className ?? "Classe"}`;
  if (scope === "LEVEL") return `Niveau ${levelLabel ?? "Niveau"}`;
  return "Toute l'ecole";
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refus de seed feed en production.");
  }

  const targetSchoolSlug = process.env.SCHOOL_SLUG?.trim();
  const school = targetSchoolSlug
    ? await prisma.school.findUnique({
        where: { slug: targetSchoolSlug },
        select: { id: true, slug: true, name: true, activeSchoolYearId: true },
      })
    : await prisma.school.findFirst({
        where: {
          memberships: {
            some: {},
          },
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, slug: true, name: true, activeSchoolYearId: true },
      });

  if (!school) {
    throw new Error("Aucune ecole avec utilisateurs trouvee.");
  }

  const memberships = await prisma.schoolMembership.findMany({
    where: { schoolId: school.id },
    select: {
      userId: true,
      role: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  const classes = await prisma.class.findMany({
    where: {
      schoolId: school.id,
      ...(school.activeSchoolYearId
        ? { schoolYearId: school.activeSchoolYearId }
        : {}),
    },
    select: {
      id: true,
      name: true,
      academicLevelId: true,
      academicLevel: {
        select: {
          id: true,
          label: true,
        },
      },
    },
    orderBy: [{ name: "asc" }],
  });

  const staffRoles = new Set([
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SCHOOL_ACCOUNTANT",
    "SCHOOL_STAFF",
    "TEACHER",
  ]);

  const staffUsers = memberships
    .filter((row) => staffRoles.has(row.role))
    .map((row) => row.user);
  const parentUsers = memberships
    .filter((row) => row.role === "PARENT")
    .map((row) => row.user);
  const studentUsers = memberships
    .filter((row) => row.role === "STUDENT")
    .map((row) => row.user);

  const allUsers = memberships.map((row) => row.user);
  if (allUsers.length === 0) {
    throw new Error("Aucun utilisateur disponible pour seed feed.");
  }
  const authorPool = staffUsers.length > 0 ? staffUsers : allUsers;

  await prisma.feedPost.deleteMany({
    where: {
      schoolId: school.id,
      title: {
        startsWith: SEED_PREFIX,
      },
    },
  });

  const audienceScopes = [
    "PARENTS_STUDENTS",
    ...(staffUsers.length > 0 ? ["STAFF_ONLY"] : []),
    ...(parentUsers.length > 0 ? ["PARENTS_ONLY"] : []),
    ...(classes.length > 0 ? ["CLASS"] : []),
    "SCHOOL_ALL",
  ];
  const seeds = Array.from({ length: 14 }, (_, index) => {
    const scope = audienceScopes[index % audienceScopes.length];
    const classTarget = pickOne(classes);
    const author = pickOne(authorPool);
    return {
      type: index % 5 === 0 ? "POLL" : "POST",
      scope,
      classTarget,
      author,
      title: `${SEED_PREFIX} Publication #${index + 1}`,
      bodyHtml: `<p>Information ${index + 1} du fil d'actualite.</p><p>Merci de consulter les details et de reagir.</p>`,
      featuredUntil:
        index % 4 === 0
          ? new Date(Date.now() + ((index % 5) + 1) * 24 * 60 * 60 * 1000)
          : null,
    };
  });

  const createdPosts = [];
  for (const entry of seeds) {
    const audienceLevelId =
      entry.scope === "CLASS"
        ? (entry.classTarget?.academicLevelId ?? null)
        : null;
    const audienceClassId =
      entry.scope === "CLASS" ? (entry.classTarget?.id ?? null) : null;
    const label = audienceLabel(
      entry.scope,
      entry.classTarget?.name,
      entry.classTarget?.academicLevel?.label,
    );

    const created = await prisma.feedPost.create({
      data: {
        schoolId: school.id,
        authorUserId: entry.author.id,
        type: entry.type,
        title: entry.title,
        bodyHtml: entry.bodyHtml,
        audienceScope: entry.scope,
        audienceLabel: label,
        audienceClassId,
        audienceLevelId,
        featuredUntil: entry.featuredUntil,
        pollQuestion:
          entry.type === "POLL"
            ? `Question #${entry.title.replace(SEED_PREFIX, "").trim()} ?`
            : null,
        pollOptionsJson:
          entry.type === "POLL"
            ? [
                { id: "option-1", label: "Oui", votes: 0 },
                { id: "option-2", label: "Non", votes: 0 },
              ]
            : undefined,
      },
    });
    createdPosts.push(created);
  }

  const everyone = [
    ...new Map(
      [...authorPool, ...parentUsers, ...studentUsers].map((u) => [u.id, u]),
    ).values(),
  ];

  for (const post of createdPosts) {
    const commentsAuthors = randomSubset(everyone, 3);
    for (const author of commentsAuthors) {
      await prisma.feedComment.create({
        data: {
          postId: post.id,
          schoolId: school.id,
          authorUserId: author.id,
          text: `Commentaire de ${author.firstName} ${author.lastName}.`,
        },
      });
    }

    const likeUsers = randomSubset(everyone, 6);
    for (const liker of likeUsers) {
      await prisma.feedLike.upsert({
        where: {
          postId_userId: {
            postId: post.id,
            userId: liker.id,
          },
        },
        update: {},
        create: {
          postId: post.id,
          schoolId: school.id,
          userId: liker.id,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        school: school.slug,
        staffUsers: staffUsers.length,
        parentUsers: parentUsers.length,
        studentUsers: studentUsers.length,
        classes: classes.length,
        postsCreated: createdPosts.length,
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
