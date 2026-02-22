import { z } from "zod";

const baseFeedSchema = z.object({
  type: z.enum(["POST", "POLL"]),
  title: z.string().trim().min(1).max(180),
  bodyText: z.string().trim().min(1),
  pollQuestion: z.string().trim().optional(),
  pollOptions: z.array(z.string().trim()).optional(),
});

export const feedPostFormSchema = baseFeedSchema.superRefine((value, ctx) => {
  if (value.type !== "POLL") {
    return;
  }
  const question = value.pollQuestion?.trim() ?? "";
  const options = (value.pollOptions ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!question) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pollQuestion"],
      message: "Question requise pour un sondage",
    });
  }

  if (options.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pollOptions"],
      message: "Deux options minimum",
    });
  }
});

export function isFeedFormValid(input: {
  type: "POST" | "POLL";
  title: string;
  bodyText: string;
  pollQuestion?: string;
  pollOptions?: string[];
}) {
  return feedPostFormSchema.safeParse(input).success;
}
