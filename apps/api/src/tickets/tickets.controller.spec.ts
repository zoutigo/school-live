import { Test, type TestingModule } from "@nestjs/testing";
import { TicketsController } from "./tickets.controller.js";
import { TicketsService } from "./tickets.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { CreateTicketDto } from "./dto/create-ticket.dto.js";
import type { ListTicketsDto } from "./dto/list-tickets.dto.js";
import type { RespondTicketDto } from "./dto/respond-ticket.dto.js";
import type { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto.js";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "TEACHER" }],
    profileCompleted: true,
    firstName: "Marie",
    lastName: "Martin",
    email: "marie@test.com",
    ...overrides,
  };
}

function makeAdmin(): AuthenticatedUser {
  return makeUser({
    id: "admin-1",
    platformRoles: ["SUPER_ADMIN"],
    memberships: [],
  });
}

const makeServiceMock = () => ({
  listTickets: jest.fn().mockResolvedValue({
    data: [],
    meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
  }),
  createTicket: jest.fn().mockResolvedValue({ id: "ticket-1" }),
  getMyTicketCount: jest.fn().mockResolvedValue({ open: 0 }),
  getTicket: jest.fn().mockResolvedValue({ id: "ticket-1" }),
  updateStatus: jest
    .fn()
    .mockResolvedValue({ id: "ticket-1", status: "IN_PROGRESS" }),
  addResponse: jest.fn().mockResolvedValue({ id: "resp-1" }),
  toggleVote: jest.fn().mockResolvedValue({ voted: true }),
  deleteTicket: jest.fn().mockResolvedValue({ deleted: true }),
});

describe("TicketsController", () => {
  let controller: TicketsController;
  let service: ReturnType<typeof makeServiceMock>;

  beforeEach(async () => {
    service = makeServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [{ provide: TicketsService, useValue: service }],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------

  describe("list()", () => {
    it("délègue au service avec l'utilisateur et la query", async () => {
      const user = makeUser();
      const query: ListTicketsDto = { page: 1, limit: 10 };

      await controller.list(user, query);

      expect(service.listTickets).toHaveBeenCalledWith(user, query);
    });

    it("retourne la réponse paginée du service", async () => {
      const user = makeUser();
      const mockResponse = {
        data: [{ id: "t1" }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      service.listTickets.mockResolvedValue(mockResponse);

      const result = await controller.list(user, {});

      expect(result).toEqual(mockResponse);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe("create()", () => {
    it("délègue au service avec dto et fichiers", async () => {
      const user = makeUser();
      const dto: CreateTicketDto = {
        type: "BUG",
        title: "Interface plantée",
        description: "L'écran reste blanc après chargement.",
        schoolSlug: "lycee-bilingue",
        platform: "web",
      };
      const files = [
        {
          originalname: "capture.png",
          buffer: Buffer.from(""),
          mimetype: "image/png",
          size: 512,
        },
      ];

      await controller.create(user, dto, files);

      expect(service.createTicket).toHaveBeenCalledWith(user, dto, files);
    });

    it("passe un tableau vide si aucun fichier", async () => {
      const user = makeUser();
      const dto: CreateTicketDto = {
        type: "FEATURE_REQUEST",
        title: "Mode nuit demandé",
        description: "Ajouter un thème sombre à l'interface.",
      };

      await controller.create(user, dto, undefined);

      expect(service.createTicket).toHaveBeenCalledWith(user, dto, []);
    });
  });

  // ---------------------------------------------------------------------------
  // myCount
  // ---------------------------------------------------------------------------

  describe("myCount()", () => {
    it("retourne le compteur de l'utilisateur", async () => {
      const user = makeUser();
      service.getMyTicketCount.mockResolvedValue({ open: 2 });

      const result = await controller.myCount(user);

      expect(service.getMyTicketCount).toHaveBeenCalledWith(user);
      expect(result).toEqual({ open: 2 });
    });
  });

  // ---------------------------------------------------------------------------
  // detail
  // ---------------------------------------------------------------------------

  describe("detail()", () => {
    it("délègue au service avec l'id et l'utilisateur", async () => {
      const user = makeUser();
      await controller.detail(user, "ticket-1");

      expect(service.getTicket).toHaveBeenCalledWith(user, "ticket-1");
    });
  });

  // ---------------------------------------------------------------------------
  // updateStatus
  // ---------------------------------------------------------------------------

  describe("updateStatus()", () => {
    it("délègue au service", async () => {
      const admin = makeAdmin();
      const dto: UpdateTicketStatusDto = { status: "IN_PROGRESS" };

      await controller.updateStatus(admin, "ticket-1", dto);

      expect(service.updateStatus).toHaveBeenCalledWith(admin, "ticket-1", dto);
    });
  });

  // ---------------------------------------------------------------------------
  // addResponse
  // ---------------------------------------------------------------------------

  describe("addResponse()", () => {
    it("délègue au service avec la réponse", async () => {
      const admin = makeAdmin();
      const dto: RespondTicketDto = {
        body: "Problème identifié.",
        isInternal: false,
      };

      await controller.addResponse(admin, "ticket-1", dto);

      expect(service.addResponse).toHaveBeenCalledWith(admin, "ticket-1", dto);
    });
  });

  // ---------------------------------------------------------------------------
  // toggleVote
  // ---------------------------------------------------------------------------

  describe("toggleVote()", () => {
    it("délègue au service", async () => {
      const admin = makeAdmin();
      await controller.toggleVote(admin, "ticket-1");

      expect(service.toggleVote).toHaveBeenCalledWith(admin, "ticket-1");
    });

    it("retourne { voted: true } lors d'un premier vote", async () => {
      const admin = makeAdmin();
      service.toggleVote.mockResolvedValue({ voted: true });

      const result = await controller.toggleVote(admin, "ticket-1");

      expect(result).toEqual({ voted: true });
    });

    it("retourne { voted: false } lors d'un retrait de vote", async () => {
      const admin = makeAdmin();
      service.toggleVote.mockResolvedValue({ voted: false });

      const result = await controller.toggleVote(admin, "ticket-1");

      expect(result).toEqual({ voted: false });
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe("remove()", () => {
    it("délègue au service", async () => {
      const user = makeUser();
      await controller.remove(user, "ticket-1");

      expect(service.deleteTicket).toHaveBeenCalledWith(user, "ticket-1");
    });

    it("retourne { deleted: true } après suppression", async () => {
      const user = makeUser();
      const result = await controller.remove(user, "ticket-1");

      expect(result).toEqual({ deleted: true });
    });
  });
});
