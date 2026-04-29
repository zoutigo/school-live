import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { FeedModule } from "../feed/feed.module.js";
import { InfrastructureModule } from "../infrastructure/infrastructure.module.js";
import { MailModule } from "../mail/mail.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { MobilePushTokensService } from "./mobile-push-tokens.service.js";
import { PushService } from "./push.service.js";
import { TimetableChangeNotificationsService } from "./timetable-change-notifications.service.js";
import { TimetableChangeProjectionService } from "./timetable-change-projection.service.js";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    InfrastructureModule,
    FeedModule,
    MailModule,
  ],
  providers: [
    MobilePushTokensService,
    PushService,
    TimetableChangeNotificationsService,
    TimetableChangeProjectionService,
  ],
  exports: [
    MobilePushTokensService,
    PushService,
    TimetableChangeNotificationsService,
    TimetableChangeProjectionService,
  ],
})
export class NotificationsModule {}
