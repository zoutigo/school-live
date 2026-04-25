import { Module } from "@nestjs/common";
import { HelpFaqsController } from "./help-faqs.controller.js";
import { HelpFaqsService } from "./help-faqs.service.js";

@Module({
  controllers: [HelpFaqsController],
  providers: [HelpFaqsService],
})
export class HelpFaqsModule {}
