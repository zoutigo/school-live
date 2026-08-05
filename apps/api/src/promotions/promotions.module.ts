import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { EnrollmentsModule } from "../enrollments/enrollments.module.js";
import { PromotionsController } from "./promotions.controller.js";
import { PromotionsService } from "./promotions.service.js";

@Module({
  imports: [AccessModule, SchoolsModule, EnrollmentsModule],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
