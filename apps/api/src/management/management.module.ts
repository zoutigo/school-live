import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { ImageStorageService } from "../files/image-storage.service.js";
import { MailModule } from "../mail/mail.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { ManagementController } from "./management.controller.js";
import { ManagementService } from "./management.service.js";

@Module({
  imports: [AccessModule, SchoolsModule, MailModule],
  controllers: [ManagementController],
  providers: [ManagementService, ImageStorageService],
})
export class ManagementModule {}
