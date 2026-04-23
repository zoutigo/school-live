import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { MediaClientService } from "../media-client/media-client.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateTicketDto } from "./dto/create-ticket.dto.js";
import type { RespondTicketDto } from "./dto/respond-ticket.dto.js";
import type { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto.js";
import { TicketsService } from "./tickets.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    platformRoles: [],
    memberships: [],
    profileCompleted: true,
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean@test.com",
    ...overrides,
  };
}

function makeSuperAdmin(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return makeUser({
    id: "admin-1",
    platformRoles: ["SUPER_ADMIN"],
    ...overrides,
  });
}

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: "ticket-1",
    type: "BUG" as const,
    status: "OPEN" as const,
    title: "Titre du bug",
    description: "Description détaillée du bug rencontré",
    platform: "web",
    appVersion: "1.0.0",
    screenPath: "/dashboard",
    authorId: "user-1",
    schoolId: "school-1",
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: "user-1",
      firstName: "Jean",
      lastName: "Dupont",
      avatarUrl: null,
      email: "jean@test.com",
    },
    school: { id: "school-1", name: "Lycée Bilingue", slug: "lycee-bilingue" },
    attachments: [],
    votes: [],
    responses: [],
    _count: { votes: 0 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const makePrismaMock = () => ({
  ticket: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  ticketResponse: {
    create: jest.fn(),
  },
  ticketVote: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  school: {
    findUnique: jest.fn(),
  },
  internalMessage: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
});

const makeMediaMock = () => ({
  uploadImage: jest.fn().mockResolvedValue({
    url: "https://storage/file.jpg",
    mimeType: "image/jpeg",
    size: 1024,
  }),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TicketsService", () => {
  let service: TicketsService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let media: ReturnType<typeof makeMediaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    media = makeMediaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MediaClientService, useValue: media },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  // -------------------------------------------------------------------------
  // createTicket
  // -------------------------------------------------------------------------

  describe("createTicket", () => {
    const validDto: CreateTicketDto = {
      type: "BUG",
      title: "Bouton ne répond pas",
      description: "En cliquant sur Enregistrer rien ne se passe.",
      schoolSlug: "lycee-bilingue",
      platform: "web",
      appVersion: "1.2.3",
      screenPath: "/notes",
    };

    it("crée un ticket avec pièces jointes", async () => {
      const user = makeUser();
      prisma.school.findUnique.mockResolvedValue({ id: "school-1" });
      prisma.ticket.create.mockResolvedValue(makeTicket());

      const file = {
        originalname: "screenshot.jpg",
        buffer: Buffer.from("data"),
        mimetype: "image/jpeg",
        size: 1024,
      };

      const result = await service.createTicket(user, validDto, [file]);

      expect(media.uploadImage).toHaveBeenCalledWith(
        "ticket-attachment",
        expect.objectContaining({ mimetype: "image/jpeg" }),
      );
      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "BUG",
            title: validDto.title,
            authorId: user.id,
            schoolId: "school-1",
          }),
        }),
      );
      expect(result).toBeDefined();
    });

    it("crée un ticket sans pièce jointe ni école", async () => {
      const user = makeUser();
      prisma.ticket.create.mockResolvedValue(makeTicket({ schoolId: null }));

      await service.createTicket(
        user,
        { ...validDto, schoolSlug: undefined },
        [],
      );

      expect(prisma.school.findUnique).not.toHaveBeenCalled();
      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ schoolId: expect.anything() }),
        }),
      );
    });

    it("lève NotFoundException si l'école est introuvable", async () => {
      prisma.school.findUnique.mockResolvedValue(null);

      await expect(
        service.createTicket(makeUser(), validDto, []),
      ).rejects.toThrow(NotFoundException);
    });

    it("crée un ticket de type FEATURE_REQUEST", async () => {
      const user = makeUser();
      prisma.school.findUnique.mockResolvedValue({ id: "school-1" });
      prisma.ticket.create.mockResolvedValue(
        makeTicket({ type: "FEATURE_REQUEST" }),
      );

      await service.createTicket(
        user,
        { ...validDto, type: "FEATURE_REQUEST" },
        [],
      );

      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: "FEATURE_REQUEST" }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // listTickets
  // -------------------------------------------------------------------------

  describe("listTickets", () => {
    it("retourne seulement ses propres tickets pour un user scolaire", async () => {
      const user = makeUser({
        memberships: [{ schoolId: "school-1", role: "TEACHER" }],
      });
      prisma.ticket.count.mockResolvedValue(1);
      prisma.ticket.findMany.mockResolvedValue([makeTicket()]);

      const result = await service.listTickets(user, {});

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ authorId: user.id }),
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("retourne tous les tickets pour un SUPER_ADMIN", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.count.mockResolvedValue(5);
      prisma.ticket.findMany.mockResolvedValue([
        makeTicket(),
        makeTicket({ id: "ticket-2", authorId: "user-2" }),
      ]);

      const result = await service.listTickets(admin, {});

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ authorId: expect.anything() }),
        }),
      );
      expect(result.meta.total).toBe(5);
    });

    it("filtre par status et type", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.count.mockResolvedValue(2);
      prisma.ticket.findMany.mockResolvedValue([]);

      await service.listTickets(admin, { status: "OPEN", type: "BUG" });

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "OPEN", type: "BUG" }),
        }),
      );
    });

    it("filtre par terme de recherche", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.count.mockResolvedValue(0);
      prisma.ticket.findMany.mockResolvedValue([]);

      await service.listTickets(admin, { q: "crash" });

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              expect.objectContaining({
                title: expect.objectContaining({ contains: "crash" }),
              }),
              expect.objectContaining({
                description: expect.objectContaining({ contains: "crash" }),
              }),
            ],
          }),
        }),
      );
    });

    it("applique la pagination correctement", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.count.mockResolvedValue(50);
      prisma.ticket.findMany.mockResolvedValue([]);

      await service.listTickets(admin, { page: 3, limit: 10 });

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // getTicket
  // -------------------------------------------------------------------------

  describe("getTicket", () => {
    it("retourne le ticket si l'utilisateur en est l'auteur", async () => {
      const user = makeUser();
      const ticket = makeTicket();
      prisma.ticket.findUnique.mockResolvedValue(ticket);

      const result = await service.getTicket(user, "ticket-1");

      expect(result).toBeDefined();
      expect(prisma.ticket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "ticket-1" } }),
      );
    });

    it("lève ForbiddenException si l'utilisateur n'est pas l'auteur", async () => {
      const otherUser = makeUser({ id: "other-user" });
      prisma.ticket.findUnique.mockResolvedValue(makeTicket());

      await expect(service.getTicket(otherUser, "ticket-1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("retourne le ticket à un platform role", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.findUnique.mockResolvedValue(
        makeTicket({ authorId: "someone-else" }),
      );

      const result = await service.getTicket(admin, "ticket-1");

      expect(result).toBeDefined();
    });

    it("filtre les réponses internes pour les non-staff", async () => {
      const user = makeUser();
      const ticket = makeTicket({
        responses: [
          { id: "r1", body: "Réponse publique", isInternal: false },
          { id: "r2", body: "Note interne", isInternal: true },
        ],
      });
      prisma.ticket.findUnique.mockResolvedValue(ticket);

      const result = await service.getTicket(user, "ticket-1");

      expect(result.responses).toHaveLength(1);
      expect(result.responses[0].isInternal).toBe(false);
    });

    it("retourne toutes les réponses (y compris internes) pour un SUPPORT", async () => {
      const support = makeUser({ platformRoles: ["SUPPORT"] });
      const ticket = makeTicket({
        responses: [
          { id: "r1", body: "Réponse publique", isInternal: false },
          { id: "r2", body: "Note interne", isInternal: true },
        ],
      });
      prisma.ticket.findUnique.mockResolvedValue(ticket);

      const result = await service.getTicket(support, "ticket-1");

      expect(result.responses).toHaveLength(2);
    });

    it("lève NotFoundException si le ticket n'existe pas", async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.getTicket(makeUser(), "missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateStatus
  // -------------------------------------------------------------------------

  describe("updateStatus", () => {
    const dto: UpdateTicketStatusDto = { status: "IN_PROGRESS" };

    it("met à jour le statut (SUPER_ADMIN)", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.findUnique.mockResolvedValue(makeTicket());
      prisma.ticket.update.mockResolvedValue(
        makeTicket({ status: "IN_PROGRESS" }),
      );

      const result = await service.updateStatus(admin, "ticket-1", dto);

      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "IN_PROGRESS" }),
        }),
      );
      expect(result).toBeDefined();
    });

    it("définit resolvedAt lors d'un passage à RESOLVED", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.findUnique.mockResolvedValue(makeTicket());
      prisma.ticket.update.mockResolvedValue(
        makeTicket({ status: "RESOLVED" }),
      );

      await service.updateStatus(admin, "ticket-1", { status: "RESOLVED" });

      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
        }),
      );
    });

    it("définit resolvedAt lors d'un passage à CLOSED", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.findUnique.mockResolvedValue(makeTicket());
      prisma.ticket.update.mockResolvedValue(makeTicket({ status: "CLOSED" }));

      await service.updateStatus(admin, "ticket-1", { status: "CLOSED" });

      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
        }),
      );
    });

    it("lève ForbiddenException pour un user scolaire", async () => {
      const teacher = makeUser({
        memberships: [{ schoolId: "s1", role: "TEACHER" }],
      });

      await expect(
        service.updateStatus(teacher, "ticket-1", dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève NotFoundException si le ticket n'existe pas", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus(admin, "missing", dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // addResponse
  // -------------------------------------------------------------------------

  describe("addResponse", () => {
    const dto: RespondTicketDto = {
      body: "Nous avons identifié le problème.",
      isInternal: false,
    };

    it("crée une réponse externe et envoie un InternalMessage", async () => {
      const admin = makeSuperAdmin();
      const ticket = makeTicket();
      const responseRow = {
        id: "resp-1",
        body: dto.body,
        isInternal: false,
        author: admin,
      };

      prisma.ticket.findUnique.mockResolvedValue(ticket);
      prisma.$transaction.mockImplementation(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => {
          prisma.ticketResponse.create.mockResolvedValue(responseRow);
          prisma.ticket.update.mockResolvedValue(ticket);
          prisma.internalMessage.create.mockResolvedValue({ id: "msg-1" });
          return fn(prisma);
        },
      );

      const result = await service.addResponse(admin, "ticket-1", dto);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(responseRow);
    });

    it("crée une note interne sans envoyer de message ni changer le statut", async () => {
      const admin = makeSuperAdmin();
      const ticket = makeTicket();
      const responseRow = {
        id: "resp-2",
        body: "Note privée",
        isInternal: true,
        author: admin,
      };

      prisma.ticket.findUnique.mockResolvedValue(ticket);
      prisma.$transaction.mockImplementation(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => {
          prisma.ticketResponse.create.mockResolvedValue(responseRow);
          return fn(prisma);
        },
      );

      await service.addResponse(admin, "ticket-1", {
        body: "Note privée",
        isInternal: true,
      });

      expect(prisma.internalMessage.create).not.toHaveBeenCalled();
      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });

    it("ne crée pas de InternalMessage si le ticket n'a pas de schoolId", async () => {
      const admin = makeSuperAdmin();
      const ticket = makeTicket({ schoolId: null });

      prisma.ticket.findUnique.mockResolvedValue(ticket);
      prisma.$transaction.mockImplementation(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => {
          prisma.ticketResponse.create.mockResolvedValue({
            id: "r1",
            body: dto.body,
            isInternal: false,
          });
          prisma.ticket.update.mockResolvedValue(ticket);
          return fn(prisma);
        },
      );

      await service.addResponse(admin, "ticket-1", dto);

      expect(prisma.internalMessage.create).not.toHaveBeenCalled();
    });

    it("lève ForbiddenException pour SALES (ne peut pas répondre)", async () => {
      const sales = makeUser({ platformRoles: ["SALES"] });
      prisma.ticket.findUnique.mockResolvedValue(makeTicket());

      await expect(service.addResponse(sales, "ticket-1", dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lève NotFoundException si le ticket n'existe pas", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.addResponse(admin, "missing", dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // toggleVote
  // -------------------------------------------------------------------------

  describe("toggleVote", () => {
    it("crée un vote si l'utilisateur n'a pas encore voté", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.findUnique.mockResolvedValue(makeTicket());
      prisma.ticketVote.findUnique.mockResolvedValue(null);
      prisma.ticketVote.create.mockResolvedValue({ id: "vote-1" });

      const result = await service.toggleVote(admin, "ticket-1");

      expect(prisma.ticketVote.create).toHaveBeenCalled();
      expect(result).toEqual({ voted: true });
    });

    it("supprime le vote si l'utilisateur a déjà voté", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.findUnique.mockResolvedValue(makeTicket());
      prisma.ticketVote.findUnique.mockResolvedValue({
        id: "vote-1",
        ticketId: "ticket-1",
        userId: "admin-1",
      });
      prisma.ticketVote.delete.mockResolvedValue({ id: "vote-1" });

      const result = await service.toggleVote(admin, "ticket-1");

      expect(prisma.ticketVote.delete).toHaveBeenCalled();
      expect(result).toEqual({ voted: false });
    });

    it("lève ForbiddenException pour un user scolaire", async () => {
      const teacher = makeUser({
        memberships: [{ schoolId: "s1", role: "TEACHER" }],
      });

      await expect(service.toggleVote(teacher, "ticket-1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lève NotFoundException si le ticket n'existe pas", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.toggleVote(admin, "missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // deleteTicket
  // -------------------------------------------------------------------------

  describe("deleteTicket", () => {
    it("autorise l'auteur à supprimer son ticket", async () => {
      const user = makeUser();
      prisma.ticket.findUnique.mockResolvedValue(makeTicket());
      prisma.ticket.delete.mockResolvedValue(makeTicket());

      const result = await service.deleteTicket(user, "ticket-1");

      expect(prisma.ticket.delete).toHaveBeenCalledWith({
        where: { id: "ticket-1" },
      });
      expect(result).toEqual({ deleted: true });
    });

    it("autorise SUPER_ADMIN à supprimer n'importe quel ticket", async () => {
      const admin = makeSuperAdmin();
      prisma.ticket.findUnique.mockResolvedValue(
        makeTicket({ authorId: "someone-else" }),
      );
      prisma.ticket.delete.mockResolvedValue(makeTicket());

      const result = await service.deleteTicket(admin, "ticket-1");

      expect(result).toEqual({ deleted: true });
    });

    it("lève ForbiddenException si l'utilisateur n'est pas l'auteur", async () => {
      const otherUser = makeUser({ id: "other" });
      prisma.ticket.findUnique.mockResolvedValue(makeTicket());

      await expect(service.deleteTicket(otherUser, "ticket-1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lève NotFoundException si le ticket n'existe pas", async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.deleteTicket(makeUser(), "missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // getMyTicketCount
  // -------------------------------------------------------------------------

  describe("getMyTicketCount", () => {
    it("retourne le nombre de tickets ouverts de l'utilisateur", async () => {
      const user = makeUser();
      prisma.ticket.count.mockResolvedValue(3);

      const result = await service.getMyTicketCount(user);

      expect(result).toEqual({ open: 3 });
      expect(prisma.ticket.count).toHaveBeenCalledWith({
        where: {
          authorId: user.id,
          status: { notIn: ["RESOLVED", "CLOSED"] },
        },
      });
    });
  });
});
