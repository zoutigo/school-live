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
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { CreateFeedCommentDto } from "./dto/create-feed-comment.dto.js";
import { CreateFeedPostDto } from "./dto/create-feed-post.dto.js";
import { ListFeedPostsDto } from "./dto/list-feed-posts.dto.js";
import { UpdateFeedPostDto } from "./dto/update-feed-post.dto.js";
import { FeedService } from "./feed.service.js";

@Controller("schools/:schoolSlug/feed")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
@Roles(
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "SCHOOL_STAFF",
  "TEACHER",
  "PARENT",
  "STUDENT",
  "ADMIN",
  "SUPER_ADMIN",
)
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly mediaClientService: MediaClientService,
    private readonly inlineMediaService: InlineMediaService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Query() query: ListFeedPostsDto,
  ) {
    return this.feedService.listPosts(user, schoolId, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateFeedPostDto,
  ) {
    return this.feedService.createPost(user, schoolId, payload);
  }

  @Patch(":postId")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("postId") postId: string,
    @Body() payload: UpdateFeedPostDto,
  ) {
    return this.feedService.updatePost(user, schoolId, postId, payload);
  }

  @Delete(":postId")
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("postId") postId: string,
  ) {
    return this.feedService.deletePost(user, schoolId, postId);
  }

  @Post("uploads/inline-image")
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
      "messaging-inline-image",
      file,
    );
    await this.inlineMediaService.registerTempUpload({
      schoolId,
      uploadedByUserId: user.id,
      scope: "FEED",
      url: uploaded.url,
    });
    return uploaded;
  }

  @Post(":postId/likes/toggle")
  toggleLike(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("postId") postId: string,
  ) {
    return this.feedService.toggleLike(user, schoolId, postId);
  }

  @Post(":postId/comments")
  comment(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("postId") postId: string,
    @Body() payload: CreateFeedCommentDto,
  ) {
    return this.feedService.addComment(user, schoolId, postId, payload);
  }
}
