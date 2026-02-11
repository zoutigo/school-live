import { Controller, Get, Param } from "@nestjs/common";
import { SchoolResolverService } from "./school-resolver.service.js";

@Controller("schools/:schoolSlug")
export class SchoolsController {
  constructor(private readonly schoolResolver: SchoolResolverService) {}

  @Get("public")
  getSchoolBranding(@Param("schoolSlug") schoolSlug: string) {
    return this.schoolResolver.getSchoolBranding(schoolSlug);
  }
}
