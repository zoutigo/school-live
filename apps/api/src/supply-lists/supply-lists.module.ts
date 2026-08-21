import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { EnrollmentsModule } from "../enrollments/enrollments.module.js";
import {
  SupplyListsController,
  ParentSupplyListsController,
} from "./supply-lists.controller.js";
import { SupplyListsService } from "./supply-lists.service.js";

@Module({
  imports: [AccessModule, SchoolsModule, EnrollmentsModule],
  controllers: [SupplyListsController, ParentSupplyListsController],
  providers: [SupplyListsService],
  exports: [SupplyListsService],
})
export class SupplyListsModule {}
