import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller.js";
import { AuthModule } from "./auth/auth.module.js";
import { EvaluationsModule } from "./evaluations/evaluations.module.js";
import { FeedModule } from "./feed/feed.module.js";
import { StudentGradesModule } from "./student-grades/student-grades.module.js";
import { HealthModule } from "./health/health.module.js";
import { ManagementModule } from "./management/management.module.js";
import { MessagingModule } from "./messaging/messaging.module.js";
import { MobileBuildsModule } from "./mobile-builds/mobile-builds.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { SchoolsModule } from "./schools/schools.module.js";
import { TimetableModule } from "./timetable/timetable.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === "test"
          ? ["../../docker/.env.test", ".env.test", "../../docker/.env", ".env"]
          : ["../../docker/.env", ".env"],
    }),
    PrismaModule,
    AuthModule,
    EvaluationsModule,
    FeedModule,
    StudentGradesModule,
    HealthModule,
    ManagementModule,
    MessagingModule,
    MobileBuildsModule,
    SchoolsModule,
    TimetableModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
