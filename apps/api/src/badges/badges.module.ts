import { Module } from "@nestjs/common";
import { SchoolsModule } from "../schools/schools.module.js";
import { FinanceModule } from "../finance/finance.module.js";
import { SupplyListsModule } from "../supply-lists/supply-lists.module.js";
import { BadgesController } from "./badges.controller.js";
import { BadgesService } from "./badges.service.js";

@Module({
  imports: [SchoolsModule, FinanceModule, SupplyListsModule],
  controllers: [BadgesController],
  providers: [BadgesService],
})
export class BadgesModule {}
