export type FeedPostType = "POST" | "POLL";
export type FeedViewerRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "SCHOOL_STAFF"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

export type FeedAudienceScope =
  | "SCHOOL_ALL"
  | "STAFF_ONLY"
  | "PARENTS_STUDENTS"
  | "PARENTS_ONLY"
  | "LEVEL"
  | "CLASS";

export type FeedAudience = {
  scope: FeedAudienceScope;
  label: string;
  levelId?: string;
  classId?: string;
};

export type FeedAttachment = {
  id: string;
  fileName: string;
  fileUrl?: string;
  sizeLabel: string;
};

export type FeedPollOption = {
  id: string;
  label: string;
  votes: number;
};

export type FeedAuthor = {
  id: string;
  fullName: string;
  civility?: "M." | "Mme" | "Mlle";
  roleLabel: string;
  avatarText: string;
};

export type FeedPost = {
  id: string;
  type: FeedPostType;
  schoolSlug: string;
  author: FeedAuthor;
  title: string;
  bodyHtml: string;
  createdAt: string;
  featuredUntil: string | null;
  audience: FeedAudience;
  attachments: FeedAttachment[];
  likedByViewer: boolean;
  likesCount: number;
  comments: FeedComment[];
  authoredByViewer?: boolean;
  canManage?: boolean;
  poll?: {
    question: string;
    options: FeedPollOption[];
    votedOptionId: string | null;
  };
};

export type FeedFilter = "all" | "featured" | "polls" | "mine";

export type FeedComment = {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
};
