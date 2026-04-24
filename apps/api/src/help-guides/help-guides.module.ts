import { Module } from "@nestjs/common";
import { MediaClientModule } from "../media-client/media-client.module.js";
import { HelpGuidesController } from "./help-guides.controller.js";
import { HelpGuidesService } from "./help-guides.service.js";

@Module({
  imports: [MediaClientModule],
  controllers: [HelpGuidesController],
  providers: [HelpGuidesService],
})
export class HelpGuidesModule {}
