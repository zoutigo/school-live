import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AccessModule } from "../access/access.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { GlobalMeController } from "./global-me.controller.js";
import { MeController } from "./me.controller.js";
import { PublicAuthController } from "./public-auth.controller.js";
import { JwtStrategy } from "./strategies/jwt.strategy.js";

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    SchoolsModule,
    AccessModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>("JWT_SECRET") ?? "dev-secret-change-me",
        signOptions: {
          expiresIn: Number(
            configService.get<string>("JWT_EXPIRES_IN") ?? 3600,
          ),
        },
      }),
    }),
  ],
  controllers: [
    AuthController,
    MeController,
    PublicAuthController,
    GlobalMeController,
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
