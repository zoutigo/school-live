import { Module } from "@nestjs/common";
import { MediaClientModule } from "../media-client/media-client.module.js";
import { TicketsController } from "./tickets.controller.js";
import { TicketsService } from "./tickets.service.js";

@Module({
  imports: [MediaClientModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
