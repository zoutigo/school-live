import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { Roles } from "../access/roles.decorator.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { FinanceService } from "./finance.service.js";
import { UpsertFeeScheduleDto } from "./dto/upsert-fee-schedule.dto.js";
import { RecordDirectPaymentDto } from "./dto/record-direct-payment.dto.js";
import { ListFeeSchedulesQueryDto } from "./dto/list-fee-schedules-query.dto.js";
import { TopUpWalletDto } from "./dto/top-up-wallet.dto.js";
import { PayAndReinscribeDto } from "./dto/pay-and-reinscribe.dto.js";

const FINANCE_ADMIN_ROLES = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SCHOOL_ACCOUNTANT",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

@Controller("schools/:schoolSlug/admin/finance")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
@Roles(...FINANCE_ADMIN_ROLES)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("fee-schedules")
  listFeeSchedules(
    @CurrentSchoolId() schoolId: string,
    @Query() query: ListFeeSchedulesQueryDto,
  ) {
    return this.financeService.listFeeSchedules(schoolId, query);
  }

  @Post("fee-schedules")
  upsertFeeSchedule(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: UpsertFeeScheduleDto,
  ) {
    return this.financeService.upsertFeeSchedule(schoolId, payload);
  }

  @Delete("fee-schedules/:feeScheduleId")
  deleteFeeSchedule(
    @CurrentSchoolId() schoolId: string,
    @Param("feeScheduleId") feeScheduleId: string,
  ) {
    return this.financeService.deleteFeeSchedule(schoolId, feeScheduleId);
  }

  @Get("students/:studentId/summary")
  getStudentFinanceSummary(
    @CurrentSchoolId() schoolId: string,
    @Param("studentId") studentId: string,
    @Query("schoolYearId") schoolYearId: string,
  ) {
    return this.financeService.getStudentFinanceSummary(
      schoolId,
      studentId,
      schoolYearId,
    );
  }

  @Post("payments")
  recordDirectPayment(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: RecordDirectPaymentDto,
  ) {
    return this.financeService.recordDirectPayment(schoolId, payload, user.id);
  }
}

@Controller("schools/:schoolSlug/me/finance")
@UseGuards(JwtAuthGuard, SchoolScopeGuard)
export class ParentFinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("wallet")
  getWalletSummary(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.financeService.getWalletSummary(schoolId, user.id);
  }

  @Post("wallet/top-up")
  topUpWallet(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: TopUpWalletDto,
  ) {
    return this.financeService.topUpWallet(
      schoolId,
      user.id,
      payload.amount,
      user.id,
      payload.note,
    );
  }

  @Post("wallet/pay-and-reinscribe")
  payAndReinscribe(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: PayAndReinscribeDto,
  ) {
    return this.financeService.payAndReinscribeFromWallet(
      schoolId,
      user.id,
      payload.studentId,
      payload.schoolYearId,
    );
  }
}
