import { Module } from "@nestjs/common";
import { EnrollmentsService } from "./enrollments.service.js";

@Module({
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
