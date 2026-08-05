import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { EnrollmentsModule } from "../enrollments/enrollments.module.js";
import {
  FinanceController,
  ParentFinanceController,
} from "./finance.controller.js";
import { FinanceService } from "./finance.service.js";

@Module({
  imports: [AccessModule, SchoolsModule, EnrollmentsModule],
  controllers: [FinanceController, ParentFinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
