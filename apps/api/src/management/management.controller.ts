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
import { ImageStorageService } from "../files/image-storage.service.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CreateAdminDto } from "./dto/create-admin.dto.js";
import { BulkUpdateEnrollmentStatusDto } from "./dto/bulk-update-enrollment-status.dto.js";
import { CreateAcademicLevelDto } from "./dto/create-academic-level.dto.js";
import { CreateClassGroupDto } from "./dto/create-class-group.dto.js";
import { CheckSchoolSlugDto } from "./dto/check-school-slug.dto.js";
import { CheckUserEmailDto } from "./dto/check-user-email.dto.js";
import { CreateClassroomDto } from "./dto/create-classroom.dto.js";
import { CreateClassSubjectOverrideDto } from "./dto/create-class-subject-override.dto.js";
import { CreateCurriculumDto } from "./dto/create-curriculum.dto.js";
import { CreateSchoolYearDto } from "./dto/create-school-year.dto.js";
import { CreateParentStudentLinkDto } from "./dto/create-parent-student-link.dto.js";
import { CreateStudentEnrollmentDto } from "./dto/create-student-enrollment.dto.js";
import { RolloverSchoolYearDto } from "./dto/rollover-school-year.dto.js";
import { SetActiveSchoolYearDto } from "./dto/set-active-school-year.dto.js";
import { CreateSchoolDto } from "./dto/create-school.dto.js";
import { CreateStudentDto } from "./dto/create-student.dto.js";
import { CreateTeacherDto } from "./dto/create-teacher.dto.js";
import { CreateTrackDto } from "./dto/create-track.dto.js";
import { CreateUserDto } from "./dto/create-user.dto.js";
import { ListUsersQueryDto } from "./dto/list-users-query.dto.js";
import { ListStudentEnrollmentsQueryDto } from "./dto/list-student-enrollments-query.dto.js";
import { UpdateAcademicLevelDto } from "./dto/update-academic-level.dto.js";
import { UpdateClassGroupDto } from "./dto/update-class-group.dto.js";
import { UpdateClassroomDto } from "./dto/update-classroom.dto.js";
import { UpdateClassSubjectOverrideDto } from "./dto/update-class-subject-override.dto.js";
import { UpdateCurriculumDto } from "./dto/update-curriculum.dto.js";
import { UpdateSchoolDto } from "./dto/update-school.dto.js";
import { UpdateStudentEnrollmentDto } from "./dto/update-student-enrollment.dto.js";
import { UpdateTrackDto } from "./dto/update-track.dto.js";
import { UpdateUserDto } from "./dto/update-user.dto.js";
import { UpsertCurriculumSubjectDto } from "./dto/upsert-curriculum-subject.dto.js";
import { ManagementService } from "./management.service.js";

@Controller()
export class ManagementController {
  constructor(
    private readonly managementService: ManagementService,
    private readonly imageStorageService: ImageStorageService,
  ) {}

  @Get("system/schools")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  listSchools() {
    return this.managementService.listSchools();
  }

  @Get("system/schools/slug-preview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  checkSchoolSlug(@Query() query: CheckSchoolSlugDto) {
    return this.managementService.checkSchoolSlug(query.name);
  }

  @Get("system/schools/:schoolId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  schoolDetails(@Param("schoolId") schoolId: string) {
    return this.managementService.getSchoolDetails(schoolId);
  }

  @Get("system/indicators")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  indicators() {
    return this.managementService.getIndicators();
  }

  @Get("system/users")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.managementService.listUsers(query);
  }

  @Get("system/users/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  userDetails(@Param("userId") userId: string) {
    return this.managementService.getUserDetails(userId);
  }

  @Get("system/users/exists")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  checkUserEmail(@Query() query: CheckUserEmailDto) {
    return this.managementService.checkUserEmail(query.email);
  }

  @Post("system/users")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  createUser(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() payload: CreateUserDto,
  ) {
    return this.managementService.createUser(currentUser, payload);
  }

  @Patch("system/users/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  updateUser(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() payload: UpdateUserDto,
  ) {
    return this.managementService.updateUser(currentUser, userId, payload);
  }

  @Delete("system/users/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  deleteUser(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("userId") userId: string,
  ) {
    return this.managementService.deleteUser(currentUser, userId);
  }

  @Post("system/admins")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  createAdmin(@Body() payload: CreateAdminDto) {
    return this.managementService.createAdmin(payload);
  }

  @Post("system/schools")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  createSchool(@Body() payload: CreateSchoolDto) {
    return this.managementService.createSchoolWithSchoolAdmin(payload);
  }

  @Patch("system/schools/:schoolId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  updateSchool(
    @Param("schoolId") schoolId: string,
    @Body() payload: UpdateSchoolDto,
  ) {
    return this.managementService.updateSchool(schoolId, payload);
  }

  @Delete("system/schools/:schoolId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  deleteSchool(@Param("schoolId") schoolId: string) {
    return this.managementService.deleteSchool(schoolId);
  }

  @Post("system/uploads/:kind")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadImage(
    @Param("kind") kind: string,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (kind !== "school-logo" && kind !== "user-avatar") {
      throw new BadRequestException("Type upload non supporte");
    }

    return this.imageStorageService.storeImage(kind, file);
  }

  @Post("schools/:schoolSlug/admin/classrooms")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  createClassroom(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateClassroomDto,
  ) {
    return this.managementService.createClassroom(schoolId, payload);
  }

  @Get("schools/:schoolSlug/admin/classrooms")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  listClassrooms(@CurrentSchoolId() schoolId: string) {
    return this.managementService.listClassrooms(schoolId);
  }

  @Patch("schools/:schoolSlug/admin/classrooms/:classId")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  updateClassroom(
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Body() payload: UpdateClassroomDto,
  ) {
    return this.managementService.updateClassroom(schoolId, classId, payload);
  }

  @Delete("schools/:schoolSlug/admin/classrooms/:classId")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  deleteClassroom(
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
  ) {
    return this.managementService.deleteClassroom(schoolId, classId);
  }

  @Get("schools/:schoolSlug/admin/classrooms/:classId/subject-overrides")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  listClassSubjectOverrides(
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
  ) {
    return this.managementService.listClassSubjectOverrides(schoolId, classId);
  }

  @Post("schools/:schoolSlug/admin/classrooms/:classId/subject-overrides")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  createClassSubjectOverride(
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Body() payload: CreateClassSubjectOverrideDto,
  ) {
    return this.managementService.createClassSubjectOverride(
      schoolId,
      classId,
      payload,
    );
  }

  @Patch(
    "schools/:schoolSlug/admin/classrooms/:classId/subject-overrides/:overrideId",
  )
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  updateClassSubjectOverride(
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Param("overrideId") overrideId: string,
    @Body() payload: UpdateClassSubjectOverrideDto,
  ) {
    return this.managementService.updateClassSubjectOverride(
      schoolId,
      classId,
      overrideId,
      payload,
    );
  }

  @Delete(
    "schools/:schoolSlug/admin/classrooms/:classId/subject-overrides/:overrideId",
  )
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  deleteClassSubjectOverride(
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Param("overrideId") overrideId: string,
  ) {
    return this.managementService.deleteClassSubjectOverride(
      schoolId,
      classId,
      overrideId,
    );
  }

  @Get("schools/:schoolSlug/admin/school-years")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  listSchoolYears(@CurrentSchoolId() schoolId: string) {
    return this.managementService.listSchoolYears(schoolId);
  }

  @Post("schools/:schoolSlug/admin/school-years")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  createSchoolYear(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateSchoolYearDto,
  ) {
    return this.managementService.createSchoolYear(schoolId, payload);
  }

  @Patch("schools/:schoolSlug/admin/school-years/active")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  setActiveSchoolYear(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: SetActiveSchoolYearDto,
  ) {
    return this.managementService.setActiveSchoolYear(schoolId, payload);
  }

  @Post("schools/:schoolSlug/admin/school-years/rollover")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  rolloverSchoolYear(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: RolloverSchoolYearDto,
  ) {
    return this.managementService.rolloverSchoolYear(schoolId, payload);
  }

  @Get("schools/:schoolSlug/admin/academic-levels")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  listAcademicLevels(@CurrentSchoolId() schoolId: string) {
    return this.managementService.listAcademicLevels(schoolId);
  }

  @Post("schools/:schoolSlug/admin/academic-levels")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  createAcademicLevel(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateAcademicLevelDto,
  ) {
    return this.managementService.createAcademicLevel(schoolId, payload);
  }

  @Patch("schools/:schoolSlug/admin/academic-levels/:academicLevelId")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  updateAcademicLevel(
    @CurrentSchoolId() schoolId: string,
    @Param("academicLevelId") academicLevelId: string,
    @Body() payload: UpdateAcademicLevelDto,
  ) {
    return this.managementService.updateAcademicLevel(
      schoolId,
      academicLevelId,
      payload,
    );
  }

  @Delete("schools/:schoolSlug/admin/academic-levels/:academicLevelId")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  deleteAcademicLevel(
    @CurrentSchoolId() schoolId: string,
    @Param("academicLevelId") academicLevelId: string,
  ) {
    return this.managementService.deleteAcademicLevel(
      schoolId,
      academicLevelId,
    );
  }

  @Get("schools/:schoolSlug/admin/tracks")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  listTracks(@CurrentSchoolId() schoolId: string) {
    return this.managementService.listTracks(schoolId);
  }

  @Post("schools/:schoolSlug/admin/tracks")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  createTrack(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateTrackDto,
  ) {
    return this.managementService.createTrack(schoolId, payload);
  }

  @Patch("schools/:schoolSlug/admin/tracks/:trackId")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  updateTrack(
    @CurrentSchoolId() schoolId: string,
    @Param("trackId") trackId: string,
    @Body() payload: UpdateTrackDto,
  ) {
    return this.managementService.updateTrack(schoolId, trackId, payload);
  }

  @Delete("schools/:schoolSlug/admin/tracks/:trackId")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  deleteTrack(
    @CurrentSchoolId() schoolId: string,
    @Param("trackId") trackId: string,
  ) {
    return this.managementService.deleteTrack(schoolId, trackId);
  }

  @Get("schools/:schoolSlug/admin/curriculums")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  listCurriculums(@CurrentSchoolId() schoolId: string) {
    return this.managementService.listCurriculums(schoolId);
  }

  @Post("schools/:schoolSlug/admin/curriculums")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  createCurriculum(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateCurriculumDto,
  ) {
    return this.managementService.createCurriculum(schoolId, payload);
  }

  @Patch("schools/:schoolSlug/admin/curriculums/:curriculumId")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  updateCurriculum(
    @CurrentSchoolId() schoolId: string,
    @Param("curriculumId") curriculumId: string,
    @Body() payload: UpdateCurriculumDto,
  ) {
    return this.managementService.updateCurriculum(
      schoolId,
      curriculumId,
      payload,
    );
  }

  @Delete("schools/:schoolSlug/admin/curriculums/:curriculumId")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  deleteCurriculum(
    @CurrentSchoolId() schoolId: string,
    @Param("curriculumId") curriculumId: string,
  ) {
    return this.managementService.deleteCurriculum(schoolId, curriculumId);
  }

  @Get("schools/:schoolSlug/admin/curriculums/:curriculumId/subjects")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  listCurriculumSubjects(
    @CurrentSchoolId() schoolId: string,
    @Param("curriculumId") curriculumId: string,
  ) {
    return this.managementService.listCurriculumSubjects(
      schoolId,
      curriculumId,
    );
  }

  @Post("schools/:schoolSlug/admin/curriculums/:curriculumId/subjects")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  upsertCurriculumSubject(
    @CurrentSchoolId() schoolId: string,
    @Param("curriculumId") curriculumId: string,
    @Body() payload: UpsertCurriculumSubjectDto,
  ) {
    return this.managementService.upsertCurriculumSubject(
      schoolId,
      curriculumId,
      payload,
    );
  }

  @Delete(
    "schools/:schoolSlug/admin/curriculums/:curriculumId/subjects/:subjectId",
  )
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  deleteCurriculumSubject(
    @CurrentSchoolId() schoolId: string,
    @Param("curriculumId") curriculumId: string,
    @Param("subjectId") subjectId: string,
  ) {
    return this.managementService.deleteCurriculumSubject(
      schoolId,
      curriculumId,
      subjectId,
    );
  }

  @Get("schools/:schoolSlug/admin/class-groups")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  listClassGroups(@CurrentSchoolId() schoolId: string) {
    return this.managementService.listClassGroups(schoolId);
  }

  @Post("schools/:schoolSlug/admin/class-groups")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  createClassGroup(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateClassGroupDto,
  ) {
    return this.managementService.createClassGroup(schoolId, payload);
  }

  @Patch("schools/:schoolSlug/admin/class-groups/:classGroupId")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  updateClassGroup(
    @CurrentSchoolId() schoolId: string,
    @Param("classGroupId") classGroupId: string,
    @Body() payload: UpdateClassGroupDto,
  ) {
    return this.managementService.updateClassGroup(
      schoolId,
      classGroupId,
      payload,
    );
  }

  @Delete("schools/:schoolSlug/admin/class-groups/:classGroupId")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  deleteClassGroup(
    @CurrentSchoolId() schoolId: string,
    @Param("classGroupId") classGroupId: string,
  ) {
    return this.managementService.deleteClassGroup(schoolId, classGroupId);
  }

  @Post("schools/:schoolSlug/admin/teachers")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "SUPER_ADMIN")
  createTeacher(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateTeacherDto,
  ) {
    return this.managementService.createTeacher(schoolId, payload);
  }

  @Post("schools/:schoolSlug/admin/students")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "SUPER_ADMIN")
  createStudent(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateStudentDto,
  ) {
    return this.managementService.createStudent(schoolId, payload);
  }

  @Get("schools/:schoolSlug/admin/students")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  listStudentsWithEnrollments(
    @CurrentSchoolId() schoolId: string,
    @Query() query: ListStudentEnrollmentsQueryDto,
  ) {
    return this.managementService.listStudentsWithEnrollments(schoolId, query);
  }

  @Get("schools/:schoolSlug/admin/students/:studentId/enrollments")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  listStudentEnrollments(
    @CurrentSchoolId() schoolId: string,
    @Param("studentId") studentId: string,
  ) {
    return this.managementService.listStudentEnrollments(schoolId, studentId);
  }

  @Post("schools/:schoolSlug/admin/students/:studentId/enrollments")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  createStudentEnrollment(
    @CurrentSchoolId() schoolId: string,
    @Param("studentId") studentId: string,
    @Body() payload: CreateStudentEnrollmentDto,
  ) {
    return this.managementService.createStudentEnrollment(
      schoolId,
      studentId,
      payload,
    );
  }

  @Patch(
    "schools/:schoolSlug/admin/students/:studentId/enrollments/:enrollmentId",
  )
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  updateStudentEnrollment(
    @CurrentSchoolId() schoolId: string,
    @Param("studentId") studentId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Body() payload: UpdateStudentEnrollmentDto,
  ) {
    return this.managementService.updateStudentEnrollment(
      schoolId,
      studentId,
      enrollmentId,
      payload,
    );
  }

  @Patch("schools/:schoolSlug/admin/enrollments/status")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "ADMIN", "SUPER_ADMIN")
  bulkUpdateEnrollmentStatus(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: BulkUpdateEnrollmentStatusDto,
  ) {
    return this.managementService.bulkUpdateEnrollmentStatus(schoolId, payload);
  }

  @Post("schools/:schoolSlug/admin/parent-students")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
  @Roles("SCHOOL_ADMIN", "SUPER_ADMIN")
  createParentStudentLink(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateParentStudentLinkDto,
  ) {
    return this.managementService.createParentStudentLink(schoolId, payload);
  }
}
