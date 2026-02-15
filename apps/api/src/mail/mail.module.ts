import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { InfrastructureModule } from "../infrastructure/infrastructure.module.js";
import { MailService } from "./mail.service.js";

@Module({
  imports: [ConfigModule, InfrastructureModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
