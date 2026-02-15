import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EMAIL_PORT } from "./email/email.port.js";
import { SmtpEmailAdapter } from "./email/smtp-email.adapter.js";
import { BullMqQueueAdapter } from "./messaging/bullmq-queue.adapter.js";
import { QUEUE_PORT } from "./messaging/queue.port.js";

@Module({
  imports: [ConfigModule],
  providers: [
    SmtpEmailAdapter,
    BullMqQueueAdapter,
    {
      provide: EMAIL_PORT,
      useExisting: SmtpEmailAdapter,
    },
    {
      provide: QUEUE_PORT,
      useExisting: BullMqQueueAdapter,
    },
  ],
  exports: [EMAIL_PORT, QUEUE_PORT],
})
export class InfrastructureModule {}
