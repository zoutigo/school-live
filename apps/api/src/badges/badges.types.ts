export interface ChildBadgeSummary {
  studentId: string;
  firstName: string;
  lastName: string;
  homeworkPending: number;
  notesUnread: number;
  disciplineUnread: number;
}

export interface TeacherClassBadgeSummary {
  classId: string;
  className: string;
  evaluationsToGrade: number;
}

export interface UnreadSummaryResponse {
  messagesUnread: number;
  feedUnread: number;
  ticketsNeedingResponse: number;
  ticketsUnreadReplies: number;
  children: ChildBadgeSummary[];
  teacherClasses: TeacherClassBadgeSummary[];
  total: number;
}
