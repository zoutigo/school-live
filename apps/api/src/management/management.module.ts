import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { MailModule } from "../mail/mail.module.js";
import { MediaClientModule } from "../media-client/media-client.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { ManagementController } from "./management.controller.js";
import { ManagementService } from "./management.service.js";

@Module({
  imports: [AccessModule, SchoolsModule, MailModule, MediaClientModule],
  controllers: [ManagementController],
  providers: [ManagementService],
})
export class ManagementModule {}
