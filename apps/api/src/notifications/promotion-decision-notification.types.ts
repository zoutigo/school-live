export const PROMOTION_DECISION_NOTIFICATION_QUEUE_NAME =
  "promotion-decision-notification";
export const PROMOTION_DECISION_NOTIFICATION_JOB_DISPATCH =
  "dispatch-promotion-decision-notification";

export type PromotionDecisionEventPayload = {
  schoolId: string;
  reportId: string;
};
