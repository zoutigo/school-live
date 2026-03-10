import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../access/roles.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CreateClassTimetableSlotDto } from "./dto/create-class-timetable-slot.dto.js";
import { CreateClassTimetableOneOffSlotDto } from "./dto/create-class-timetable-one-off-slot.dto.js";
import { CreateClassTimetableSlotExceptionDto } from "./dto/create-class-timetable-slot-exception.dto.js";
import { CreateSchoolCalendarEventDto } from "./dto/create-school-calendar-event.dto.js";
import { ClassTimetableContextQueryDto } from "./dto/class-timetable-context-query.dto.js";
import { ListClassTimetableQueryDto } from "./dto/list-class-timetable-query.dto.js";
import { ListMyTimetableQueryDto } from "./dto/list-my-timetable-query.dto.js";
import { ListSchoolCalendarEventsQueryDto } from "./dto/list-school-calendar-events-query.dto.js";
import { SetClassSubjectStyleDto } from "./dto/set-class-subject-style.dto.js";
import { UpdateClassTimetableOneOffSlotDto } from "./dto/update-class-timetable-one-off-slot.dto.js";
import { UpdateClassTimetableSlotExceptionDto } from "./dto/update-class-timetable-slot-exception.dto.js";
import { UpdateClassTimetableSlotDto } from "./dto/update-class-timetable-slot.dto.js";
import { UpdateSchoolCalendarEventDto } from "./dto/update-school-calendar-event.dto.js";
import { TimetableService } from "./timetable.service.js";

@Controller("schools/:schoolSlug/timetable")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get("me")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "PARENT",
    "STUDENT",
    "SUPER_ADMIN",
  )
  myTimetable(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Query() query: ListMyTimetableQueryDto,
  ) {
    return this.timetableService.myTimetable(user, schoolId, query);
  }

  @Get("classes/:classId/context")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  classContext(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Query() query: ClassTimetableContextQueryDto,
  ) {
    return this.timetableService.classContext(
      user,
      schoolId,
      classId,
      query.schoolYearId,
    );
  }

  @Get("classes/:classId")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  classTimetable(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Query() query: ListClassTimetableQueryDto,
  ) {
    return this.timetableService.classTimetable(user, schoolId, classId, query);
  }

  @Post("classes/:classId/slots")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  createSlot(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Body() payload: CreateClassTimetableSlotDto,
  ) {
    return this.timetableService.createSlot(user, schoolId, classId, payload);
  }

  @Patch("slots/:slotId")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  updateSlot(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("slotId") slotId: string,
    @Body() payload: UpdateClassTimetableSlotDto,
  ) {
    return this.timetableService.updateSlot(user, schoolId, slotId, payload);
  }

  @Delete("slots/:slotId")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  deleteSlot(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("slotId") slotId: string,
  ) {
    return this.timetableService.deleteSlot(user, schoolId, slotId);
  }

  @Patch("classes/:classId/subjects/:subjectId/style")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  setSubjectStyle(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Param("subjectId") subjectId: string,
    @Body() payload: SetClassSubjectStyleDto,
  ) {
    return this.timetableService.setClassSubjectStyle(
      user,
      schoolId,
      classId,
      subjectId,
      payload,
    );
  }

  @Post("classes/:classId/one-off-slots")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  createOneOffSlot(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Body() payload: CreateClassTimetableOneOffSlotDto,
  ) {
    return this.timetableService.createOneOffSlot(
      user,
      schoolId,
      classId,
      payload,
    );
  }

  @Patch("one-off-slots/:oneOffSlotId")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  updateOneOffSlot(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("oneOffSlotId") oneOffSlotId: string,
    @Body() payload: UpdateClassTimetableOneOffSlotDto,
  ) {
    return this.timetableService.updateOneOffSlot(
      user,
      schoolId,
      oneOffSlotId,
      payload,
    );
  }

  @Delete("one-off-slots/:oneOffSlotId")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  deleteOneOffSlot(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("oneOffSlotId") oneOffSlotId: string,
  ) {
    return this.timetableService.deleteOneOffSlot(user, schoolId, oneOffSlotId);
  }

  @Post("slots/:slotId/exceptions")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  createSlotException(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("slotId") slotId: string,
    @Body() payload: CreateClassTimetableSlotExceptionDto,
  ) {
    return this.timetableService.createSlotException(
      user,
      schoolId,
      slotId,
      payload,
    );
  }

  @Patch("slot-exceptions/:exceptionId")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  updateSlotException(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("exceptionId") exceptionId: string,
    @Body() payload: UpdateClassTimetableSlotExceptionDto,
  ) {
    return this.timetableService.updateSlotException(
      user,
      schoolId,
      exceptionId,
      payload,
    );
  }

  @Delete("slot-exceptions/:exceptionId")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  deleteSlotException(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("exceptionId") exceptionId: string,
  ) {
    return this.timetableService.deleteSlotException(
      user,
      schoolId,
      exceptionId,
    );
  }

  @Get("calendar-events")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  listCalendarEvents(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Query() query: ListSchoolCalendarEventsQueryDto,
  ) {
    return this.timetableService.listCalendarEvents(user, schoolId, query);
  }

  @Post("calendar-events")
  @Roles("SCHOOL_ADMIN", "SCHOOL_MANAGER", "SUPERVISOR", "SUPER_ADMIN")
  createCalendarEvent(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateSchoolCalendarEventDto,
  ) {
    return this.timetableService.createCalendarEvent(user, schoolId, payload);
  }

  @Patch("calendar-events/:eventId")
  @Roles("SCHOOL_ADMIN", "SCHOOL_MANAGER", "SUPERVISOR", "SUPER_ADMIN")
  updateCalendarEvent(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("eventId") eventId: string,
    @Body() payload: UpdateSchoolCalendarEventDto,
  ) {
    return this.timetableService.updateCalendarEvent(
      user,
      schoolId,
      eventId,
      payload,
    );
  }

  @Delete("calendar-events/:eventId")
  @Roles("SCHOOL_ADMIN", "SCHOOL_MANAGER", "SUPERVISOR", "SUPER_ADMIN")
  deleteCalendarEvent(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("eventId") eventId: string,
  ) {
    return this.timetableService.deleteCalendarEvent(user, schoolId, eventId);
  }
}
