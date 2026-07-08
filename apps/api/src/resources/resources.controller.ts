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
import { AnyMembershipRolesGuard } from "../access/any-membership-roles.guard.js";
import { Roles } from "../access/roles.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { CreateResourceDto } from "./dto/create-resource.dto.js";
import { ListMyResourcesQueryDto } from "./dto/list-my-resources-query.dto.js";
import { ListResourcesQueryDto } from "./dto/list-resources-query.dto.js";
import { UpdateResourceDto } from "./dto/update-resource.dto.js";
import { ResourcesService } from "./resources.service.js";
import {
  resourceLocaleFromUser,
  translateResourceError,
} from "./resources.translations.js";

// Le module Ressources est global à l'application : une ressource approuvée est
// visible par n'importe quel élève/enseignant, quel que soit son école ou son niveau,
// filtrée uniquement par les critères de recherche (niveau/matière/séquence/école).
@Controller("resources")
@UseGuards(JwtAuthGuard, AnyMembershipRolesGuard, RolesGuard)
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
export class ResourcesController {
  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly mediaClientService: MediaClientService,
    private readonly inlineMediaService: InlineMediaService,
  ) {}

  @Get()
  listResources(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListResourcesQueryDto,
  ) {
    return this.resourcesService.listResources(user, query);
  }

  @Get("favorites")
  listFavorites(@CurrentUser() user: AuthenticatedUser) {
    return this.resourcesService.listFavorites(user);
  }

  @Get("mine")
  listMyResources(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMyResourcesQueryDto,
  ) {
    return this.resourcesService.listMyResources(user, query);
  }

  @Get("catalog")
  listCatalog() {
    return this.resourcesService.listCatalog();
  }

  @Get(":resourceId")
  getResource(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resourceId") resourceId: string,
  ) {
    return this.resourcesService.getResource(user, resourceId);
  }

  @Post()
  @Roles("TEACHER", "SCHOOL_ADMIN")
  createResource(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateResourceDto,
  ) {
    return this.resourcesService.createResource(user, payload);
  }

  @Patch(":resourceId")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  updateResource(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resourceId") resourceId: string,
    @Body() payload: UpdateResourceDto,
  ) {
    return this.resourcesService.updateResource(user, resourceId, payload);
  }

  @Post(":resourceId/favorite")
  favoriteResource(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resourceId") resourceId: string,
  ) {
    return this.resourcesService.favoriteResource(user, resourceId);
  }

  @Delete(":resourceId/favorite")
  unfavoriteResource(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resourceId") resourceId: string,
  ) {
    return this.resourcesService.unfavoriteResource(user, resourceId);
  }

  @Post("uploads/attachment")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadAttachment(
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    return this.mediaClientService.uploadImage("resource-attachment", file);
  }

  @Post("uploads/inline-image")
  @Roles("TEACHER", "SCHOOL_ADMIN")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadInlineImage(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (!file) {
      throw new BadRequestException(
        translateResourceError(
          resourceLocaleFromUser(user),
          "resources.errors.missingImageFile",
        ),
      );
    }
    const uploaded = await this.mediaClientService.uploadImage(
      "resource-inline-image",
      file,
    );
    await this.inlineMediaService.registerTempUpload({
      schoolId: null,
      uploadedByUserId: user.id,
      scope: "RESOURCE",
      url: uploaded.url,
    });
    return uploaded;
  }
}
