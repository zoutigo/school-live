import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { MailModule } from "../mail/mail.module.js";
import { MediaClientModule } from "../media-client/media-client.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { TestsAdminController } from "./tests-admin.controller.js";
import { TestsController } from "./tests.controller.js";
import { TestsService } from "./tests.service.js";

@Module({
  imports: [
    PrismaModule,
    MediaClientModule,
    AccessModule,
    SchoolsModule,
    MailModule,
  ],
  controllers: [TestsController, TestsAdminController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
