import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { InlineMediaService } from "../media/inline-media.service.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { AddHomeworkCommentDto } from "./dto/add-homework-comment.dto.js";
import { CreateHomeworkDto } from "./dto/create-homework.dto.js";
import { ListHomeworkDto } from "./dto/list-homework.dto.js";
import { SetHomeworkCompletionDto } from "./dto/set-homework-completion.dto.js";
import { UpdateHomeworkDto } from "./dto/update-homework.dto.js";
import { HomeworkService } from "./homework.service.js";

@Controller()
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
export class HomeworkController {
  constructor(
    private readonly homeworkService: HomeworkService,
    private readonly mediaClientService: MediaClientService,
    private readonly inlineMediaService: InlineMediaService,
  ) {}

  @Get("schools/:schoolSlug/classes/:classId/homework")
  @Roles(
    "PARENT",
    "STUDENT",
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  listClassHomework(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Query() query: ListHomeworkDto,
  ) {
    return this.homeworkService.listClassHomework(
      user,
      schoolId,
      classId,
      query,
    );
  }

  @Get("schools/:schoolSlug/classes/:classId/homework/:homeworkId")
  @Roles(
    "PARENT",
    "STUDENT",
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  getHomeworkDetail(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Param("homeworkId") homeworkId: string,
    @Query() query: ListHomeworkDto,
  ) {
    return this.homeworkService.getHomeworkDetail(
      user,
      schoolId,
      classId,
      homeworkId,
      query.studentId,
    );
  }

  @Post("schools/:schoolSlug/classes/:classId/homework")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  createHomework(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Body() payload: CreateHomeworkDto,
  ) {
    return this.homeworkService.createHomework(
      user,
      schoolId,
      classId,
      payload,
    );
  }

  @Patch("schools/:schoolSlug/classes/:classId/homework/:homeworkId")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  updateHomework(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Param("homeworkId") homeworkId: string,
    @Body() payload: UpdateHomeworkDto,
  ) {
    return this.homeworkService.updateHomework(
      user,
      schoolId,
      classId,
      homeworkId,
      payload,
    );
  }

  @Delete("schools/:schoolSlug/classes/:classId/homework/:homeworkId")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  deleteHomework(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Param("homeworkId") homeworkId: string,
  ) {
    return this.homeworkService.deleteHomework(
      user,
      schoolId,
      classId,
      homeworkId,
    );
  }

  @Post("schools/:schoolSlug/classes/:classId/homework/:homeworkId/comments")
  @Roles(
    "PARENT",
    "STUDENT",
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  addComment(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Param("homeworkId") homeworkId: string,
    @Body() payload: AddHomeworkCommentDto,
  ) {
    return this.homeworkService.addComment(
      user,
      schoolId,
      classId,
      homeworkId,
      payload,
    );
  }

  @Patch("schools/:schoolSlug/classes/:classId/homework/:homeworkId/completion")
  @Roles("PARENT", "STUDENT")
  setCompletion(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Param("homeworkId") homeworkId: string,
    @Body() payload: SetHomeworkCompletionDto,
  ) {
    return this.homeworkService.setCompletion(
      user,
      schoolId,
      classId,
      homeworkId,
      payload,
    );
  }

  @Post("schools/:schoolSlug/homework/uploads/attachment")
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
    return this.mediaClientService.uploadImage("homework-attachment", file);
  }

  @Post("schools/:schoolSlug/homework/uploads/inline-image")
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
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  async uploadInlineImage(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (!file) {
      throw new BadRequestException("Fichier image manquant");
    }
    const uploaded = await this.mediaClientService.uploadImage(
      "homework-inline-image",
      file,
    );
    await this.inlineMediaService.registerTempUpload({
      schoolId,
      uploadedByUserId: user.id,
      scope: "HOMEWORK",
      url: uploaded.url,
    });
    return uploaded;
  }
}
