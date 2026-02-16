import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { MailModule } from "../mail/mail.module.js";
import { MediaClientModule } from "../media-client/media-client.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { MessagingController } from "./messaging.controller.js";
import { MessagingService } from "./messaging.service.js";

@Module({
  imports: [AccessModule, SchoolsModule, MailModule, MediaClientModule],
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
