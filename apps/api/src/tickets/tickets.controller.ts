import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CreateTicketDto } from "./dto/create-ticket.dto.js";
import { ListTicketsDto } from "./dto/list-tickets.dto.js";
import { RespondTicketDto } from "./dto/respond-ticket.dto.js";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto.js";
import { TicketsService } from "./tickets.service.js";

// Route plateforme sans SchoolScopeGuard : RolesGuard ne peut pas résoudre
// les rôles scolaires (pas de req.schoolRoles injecté). L'autorisation fine
// (admin-only pour répondre/statut, platform-only pour voter) est gérée
// dans TicketsService via requirePlatformRole().
@Controller("tickets")
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListTicketsDto) {
    return this.ticketsService.listTickets(user, query);
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor("attachments", 5, {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTicketDto,
    @UploadedFiles()
    files?: Array<{
      originalname?: string;
      buffer: Buffer;
      mimetype: string;
      size: number;
    }>,
  ) {
    return this.ticketsService.createTicket(user, dto, files ?? []);
  }

  @Get("my-count")
  myCount(@CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.getMyTicketCount(user);
  }

  @Get(":ticketId")
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param("ticketId") ticketId: string,
  ) {
    return this.ticketsService.getTicket(user, ticketId);
  }

  @Patch(":ticketId/status")
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("ticketId") ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(user, ticketId, dto);
  }

  @Post(":ticketId/responses")
  addResponse(
    @CurrentUser() user: AuthenticatedUser,
    @Param("ticketId") ticketId: string,
    @Body() dto: RespondTicketDto,
  ) {
    return this.ticketsService.addResponse(user, ticketId, dto);
  }

  @Post(":ticketId/votes")
  toggleVote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("ticketId") ticketId: string,
  ) {
    return this.ticketsService.toggleVote(user, ticketId);
  }

  @Delete(":ticketId")
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("ticketId") ticketId: string,
  ) {
    return this.ticketsService.deleteTicket(user, ticketId);
  }
}
