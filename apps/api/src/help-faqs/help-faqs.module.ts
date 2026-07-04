import { Module } from "@nestjs/common";
import { MediaClientModule } from "../media-client/media-client.module.js";
import { HelpFaqsController } from "./help-faqs.controller.js";
import { HelpFaqsService } from "./help-faqs.service.js";

@Module({
  imports: [MediaClientModule],
  controllers: [HelpFaqsController],
  providers: [HelpFaqsService],
})
export class HelpFaqsModule {}
