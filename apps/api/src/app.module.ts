import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller.js";
import { AuthModule } from "./auth/auth.module.js";
import { GradesModule } from "./grades/grades.module.js";
import { HealthModule } from "./health/health.module.js";
import { ManagementModule } from "./management/management.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { SchoolsModule } from "./schools/schools.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["apps/api/.env", ".env"],
    }),
    PrismaModule,
    AuthModule,
    GradesModule,
    HealthModule,
    ManagementModule,
    SchoolsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
