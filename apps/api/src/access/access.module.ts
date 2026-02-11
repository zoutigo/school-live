import { Module } from "@nestjs/common";
import { SchoolsModule } from "../schools/schools.module.js";
import { RolesGuard } from "./roles.guard.js";
import { SchoolScopeGuard } from "./school-scope.guard.js";

@Module({
  imports: [SchoolsModule],
  providers: [RolesGuard, SchoolScopeGuard],
  exports: [RolesGuard, SchoolScopeGuard],
})
export class AccessModule {}
