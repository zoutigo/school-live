export const TIMETABLE_CHANGE_QUEUE_NAME = "timetable-change";
export const TIMETABLE_CHANGE_JOB_DISPATCH = "dispatch-timetable-change";

export type TimetableChangeKind =
  | "ONE_OFF_CREATED"
  | "ONE_OFF_UPDATED"
  | "ONE_OFF_DELETED"
  | "OCCURRENCE_OVERRIDDEN"
  | "OCCURRENCE_CANCELLED"
  | "OCCURRENCE_OVERRIDE_UPDATED"
  | "OCCURRENCE_OVERRIDE_DELETED";

export type TimetableChangeSnapshot = {
  date: string;
  startMinute: number;
  endMinute: number;
  subjectId: string;
  subjectName: string;
  teacherUserId: string;
  teacherName: string;
  room: string | null;
  status: "PLANNED" | "CANCELLED";
  sourceKind: "ONE_OFF" | "OCCURRENCE";
};

export type TimetableChangeEventPayload = {
  schoolId: string;
  classId: string;
  className: string;
  actorUserId: string;
  actorFullName: string;
  kind: TimetableChangeKind;
  before?: TimetableChangeSnapshot;
  after?: TimetableChangeSnapshot;
  reason?: string | null;
};
