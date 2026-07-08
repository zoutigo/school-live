import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { MediaClientModule } from "../media-client/media-client.module.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ResourcesAdminController } from "./resources-admin.controller.js";
import { ResourcesController } from "./resources.controller.js";
import { ResourcesService } from "./resources.service.js";

@Module({
  imports: [PrismaModule, MediaClientModule, AccessModule],
  controllers: [ResourcesController, ResourcesAdminController],
  providers: [ResourcesService, InlineMediaService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
