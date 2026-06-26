import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { FeedModule } from "../feed/feed.module.js";
import { InfrastructureModule } from "../infrastructure/infrastructure.module.js";
import { MailModule } from "../mail/mail.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { GradePublishedNotificationsService } from "./grade-published-notifications.service.js";
import { GradePublishedNotificationsProjectionService } from "./grade-published-notifications-projection.service.js";
import { HomeworkNotificationsProjectionService } from "./homework-notifications-projection.service.js";
import { HomeworkNotificationsService } from "./homework-notifications.service.js";
import { MobilePushTokensService } from "./mobile-push-tokens.service.js";
import { PushService } from "./push.service.js";
import { RoomStatusChangeNotificationsService } from "./room-status-change-notifications.service.js";
import { RoomStatusChangeProjectionService } from "./room-status-change-projection.service.js";
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
    HomeworkNotificationsService,
    HomeworkNotificationsProjectionService,
    GradePublishedNotificationsService,
    GradePublishedNotificationsProjectionService,
    RoomStatusChangeNotificationsService,
    RoomStatusChangeProjectionService,
  ],
  exports: [
    MobilePushTokensService,
    PushService,
    TimetableChangeNotificationsService,
    TimetableChangeProjectionService,
    HomeworkNotificationsService,
    HomeworkNotificationsProjectionService,
    GradePublishedNotificationsService,
    GradePublishedNotificationsProjectionService,
    RoomStatusChangeNotificationsService,
    RoomStatusChangeProjectionService,
  ],
})
export class NotificationsModule {}
