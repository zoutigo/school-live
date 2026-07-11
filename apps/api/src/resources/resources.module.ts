import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { MediaClientModule } from "../media-client/media-client.module.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ResourceSubmissionNotificationsService } from "./resource-submission-notifications.service.js";
import { ResourcesAdminController } from "./resources-admin.controller.js";
import { ResourcesController } from "./resources.controller.js";
import { ResourcesService } from "./resources.service.js";

@Module({
  imports: [PrismaModule, MediaClientModule, AccessModule, NotificationsModule],
  controllers: [ResourcesController, ResourcesAdminController],
  providers: [
    ResourcesService,
    InlineMediaService,
    ResourceSubmissionNotificationsService,
  ],
  exports: [ResourcesService],
})
export class ResourcesModule {}
