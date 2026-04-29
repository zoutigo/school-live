import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EMAIL_PORT } from "./email/email.port.js";
import { SmtpEmailAdapter } from "./email/smtp-email.adapter.js";
import { BullMqQueueAdapter } from "./messaging/bullmq-queue.adapter.js";
import { QUEUE_PORT } from "./messaging/queue.port.js";
import { ExpoPushAdapter } from "./push/expo-push.adapter.js";
import { PUSH_PORT } from "./push/push.port.js";

@Module({
  imports: [ConfigModule],
  providers: [
    SmtpEmailAdapter,
    BullMqQueueAdapter,
    ExpoPushAdapter,
    {
      provide: EMAIL_PORT,
      useExisting: SmtpEmailAdapter,
    },
    {
      provide: QUEUE_PORT,
      useExisting: BullMqQueueAdapter,
    },
    {
      provide: PUSH_PORT,
      useExisting: ExpoPushAdapter,
    },
  ],
  exports: [EMAIL_PORT, QUEUE_PORT, PUSH_PORT],
})
export class InfrastructureModule {}
