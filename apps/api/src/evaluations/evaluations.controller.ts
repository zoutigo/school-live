import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Roles } from "../access/roles.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { CreateEvaluationDto } from "./dto/create-evaluation.dto.js";
import { ListStudentNotesDto } from "./dto/list-student-notes.dto.js";
import { UpdateEvaluationDto } from "./dto/update-evaluation.dto.js";
import { UpsertEvaluationScoresDto } from "./dto/upsert-evaluation-scores.dto.js";
import { UpsertTermReportsDto } from "./dto/upsert-term-reports.dto.js";
import { EvaluationsService } from "./evaluations.service.js";

@Controller()
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
export class EvaluationsController {
  constructor(
    private readonly evaluationsService: EvaluationsService,
    private readonly mediaClientService: MediaClientService,
  ) {}

  @Get("schools/:schoolSlug/classes/:classId/evaluations/context")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  getTeacherContext(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
  ) {
    return this.evaluationsService.getTeacherContext(user, schoolId, classId);
  }

  @Get("schools/:schoolSlug/classes/:classId/evaluations")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  listClassEvaluations(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
  ) {
    return this.evaluationsService.listClassEvaluations(
      user,
      schoolId,
      classId,
    );
  }

  @Post("schools/:schoolSlug/classes/:classId/evaluations")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  createEvaluation(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Body() payload: CreateEvaluationDto,
  ) {
    return this.evaluationsService.createEvaluation(
      user,
      schoolId,
      classId,
      payload,
    );
  }

  @Get("schools/:schoolSlug/classes/:classId/evaluations/:evaluationId")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  getEvaluation(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Param("evaluationId") evaluationId: string,
  ) {
    return this.evaluationsService.getEvaluation(
      user,
      schoolId,
      classId,
      evaluationId,
    );
  }

  @Patch("schools/:schoolSlug/classes/:classId/evaluations/:evaluationId")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  updateEvaluation(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Param("evaluationId") evaluationId: string,
    @Body() payload: UpdateEvaluationDto,
  ) {
    return this.evaluationsService.updateEvaluation(
      user,
      schoolId,
      classId,
      evaluationId,
      payload,
    );
  }

  @Patch(
    "schools/:schoolSlug/classes/:classId/evaluations/:evaluationId/scores",
  )
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  upsertScores(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Param("evaluationId") evaluationId: string,
    @Body() payload: UpsertEvaluationScoresDto,
  ) {
    return this.evaluationsService.upsertScores(
      user,
      schoolId,
      classId,
      evaluationId,
      payload,
    );
  }

  @Post("schools/:schoolSlug/evaluations/uploads/attachment")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  uploadAttachment(
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    return this.mediaClientService.uploadImage("evaluation-attachment", file);
  }

  @Get("schools/:schoolSlug/classes/:classId/term-reports")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  listClassTermReports(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Query() query: ListStudentNotesDto,
  ) {
    return this.evaluationsService.listClassTermReports(
      user,
      schoolId,
      classId,
      query.term ?? undefined,
    );
  }

  @Patch("schools/:schoolSlug/classes/:classId/term-reports/:term")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  upsertClassTermReports(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Param("term") term: string,
    @Body() payload: UpsertTermReportsDto,
  ) {
    return this.evaluationsService.upsertClassTermReports(
      user,
      schoolId,
      classId,
      term as ListStudentNotesDto["term"],
      payload,
    );
  }

  @Get("schools/:schoolSlug/students/:studentId/notes")
  @Roles(
    "PARENT",
    "STUDENT",
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  listStudentNotes(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("studentId") studentId: string,
    @Query() query: ListStudentNotesDto,
  ) {
    return this.evaluationsService.listStudentNotes(
      user,
      schoolId,
      studentId,
      query.term,
    );
  }
}
