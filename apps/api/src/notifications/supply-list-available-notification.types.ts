export const SUPPLY_LIST_AVAILABLE_NOTIFICATION_QUEUE_NAME =
  "supply-list-available-notification";
export const SUPPLY_LIST_AVAILABLE_NOTIFICATION_JOB_DISPATCH =
  "dispatch-supply-list-available-notification";

export type SupplyListAvailableEventPayload = {
  schoolId: string;
  studentId: string;
  schoolYearId: string;
};
