import { ManagementService } from "./management.service.js";
import type { CreateParentStudentLinkDto } from "./dto/create-parent-student-link.dto.js";
import type { MailService } from "../mail/mail.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

/**
 * Régression (prod, 2026-09-08) : associer un parent depuis la fiche élève a
 * créé deux comptes `User` distincts pour le même numéro de téléphone, à 3ms
 * d'écart — une double soumission (clic rapide / retry réseau) a fait courir
 * deux requêtes qui ont chacune vu "aucun utilisateur existant" avant que
 * l'une des deux ne commite son insert. `User.phone` n'a pas de contrainte
 * unique en base (seul `UserPhoneCredential.phoneE164`, posé seulement après
 * activation), donc rien n'empêchait ce doublon.
 *
 * Le correctif fait courir la recherche + création dans une seule
 * transaction protégée par un verrou consultatif Postgres
 * (`pg_advisory_xact_lock`) scopé sur l'email/téléphone normalisé : une
 * deuxième requête concurrente attend que la première commite, puis retrouve
 * l'utilisateur déjà créé au lieu d'en insérer un second.
 */

const basePayload: CreateParentStudentLinkDto = {
  studentId: "student-1",
  phone: "691629949",
  pin: "123456",
};

/**
 * Simule postgres : `$transaction` exécute les callbacks de façon
 * strictement séquentielle (comme le ferait `pg_advisory_xact_lock` en
 * sérialisant deux connexions concurrentes), et partage un unique magasin de
 * `User` entre les transactions pour que la 2e requête voie l'utilisateur
 * créé par la 1re.
 */
function makeSerializingPrisma() {
  const users: Array<{ id: string; email: string; phone: string | null }> = [];
  let nextId = 1;
  const executedLockKeys: string[] = [];
  const activationCodesCreated: unknown[] = [];

  const txFactory = () => ({
    $executeRaw: jest.fn((strings: TemplateStringsArray, key: string) => {
      executedLockKeys.push(key);
      return Promise.resolve(1);
    }),
    user: {
      findUnique: jest.fn(
        ({ where }: { where: { email?: string; id?: string } }) => {
          const found = where.id
            ? users.find((u) => u.id === where.id)
            : users.find((u) => u.email === where.email);
          return Promise.resolve(found ? { ...found, memberships: [] } : null);
        },
      ),
      findFirst: jest.fn(({ where }: { where: { phone?: string } }) =>
        Promise.resolve(users.find((u) => u.phone === where.phone) ?? null),
      ),
      create: jest.fn(
        ({ data }: { data: { email: string; phone: string | null } }) => {
          const created = {
            id: `user-${nextId++}`,
            email: data.email,
            phone: data.phone,
          };
          users.push(created);
          return Promise.resolve(created);
        },
      ),
    },
    userPhoneCredential: {
      findUnique: jest.fn(() => Promise.resolve(null)),
    },
    schoolMembership: {
      create: jest.fn(() => Promise.resolve({ id: "membership-1" })),
    },
    activationCode: {
      updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
      create: jest.fn((args: unknown) => {
        activationCodesCreated.push(args);
        return Promise.resolve({ id: `code-${activationCodesCreated.length}` });
      }),
    },
  });

  const prisma = {
    student: {
      findFirst: jest.fn(() => Promise.resolve({ id: "student-1" })),
    },
    parentStudent: {
      upsert: jest.fn(({ create }: { create: { parentUserId: string } }) =>
        Promise.resolve({ id: "link-1", parentUserId: create.parentUserId }),
      ),
    },
    school: {
      findUnique: jest.fn(() => Promise.resolve({ slug: "test-school" })),
    },
    $transaction: jest.fn(
      async (callback: (tx: unknown) => Promise<unknown>) => {
        return callback(txFactory());
      },
    ),
  };

  return { prisma, users, executedLockKeys, activationCodesCreated };
}

function makeService(prisma: Record<string, unknown>) {
  return new ManagementService(
    prisma as unknown as PrismaService,
    {
      sendTemporaryPasswordEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as MailService,
  );
}

describe("ManagementService.createParentStudentLink — course de création en doublon", () => {
  it("acquiert un verrou consultatif Postgres scopé sur le contact avant de chercher/créer le parent", async () => {
    const { prisma, executedLockKeys } = makeSerializingPrisma();
    const service = makeService(prisma);

    await service.createParentStudentLink("school-1", { ...basePayload });

    expect(executedLockKeys).toEqual(["+237691629949"]);
  });

  it("deux appels séquentiels avec le même téléphone ne créent qu'un seul User", async () => {
    const { prisma, users } = makeSerializingPrisma();
    const service = makeService(prisma);

    const first = await service.createParentStudentLink("school-1", {
      ...basePayload,
    });
    const second = await service.createParentStudentLink("school-1", {
      ...basePayload,
    });

    expect(users).toHaveLength(1);
    expect((first as { parentUserId: string }).parentUserId).toBe(
      (second as { parentUserId: string }).parentUserId,
    );
  });

  it("normalise différents formats du même numéro vers la même clé de verrou/contact", async () => {
    const { prisma, users } = makeSerializingPrisma();
    const service = makeService(prisma);

    await service.createParentStudentLink("school-1", {
      ...basePayload,
      phone: "691629949",
    });
    await service.createParentStudentLink("school-1", {
      ...basePayload,
      phone: "+237 69 16 29 949".replace(/\s/g, ""),
    });

    expect(users).toHaveLength(1);
  });

  it("n'envoie l'e-mail / le code d'activation qu'après la création effective, jamais pour un utilisateur déjà existant", async () => {
    const { activationCodesCreated, prisma } = makeSerializingPrisma();
    const service = makeService(prisma);

    await service.createParentStudentLink("school-1", { ...basePayload });
    await service.createParentStudentLink("school-1", { ...basePayload });

    expect(activationCodesCreated).toHaveLength(1);
  });
});
