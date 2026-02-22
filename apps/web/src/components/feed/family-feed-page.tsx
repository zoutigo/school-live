"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlignJustify,
  CalendarDays,
  Crown,
  FileText,
  Heart,
  MessageCircle,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  Vote,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";
import {
  RichTextEditor,
  type RichTextEditorRef,
} from "../editor/rich-text-editor";
import { buildDemoFeed } from "./feed-demo-data";
import {
  addFeedComment,
  canUseBackendFeed,
  createFeedPost,
  deleteFeedPost,
  listFeedPosts,
  toggleFeedLike,
  updateFeedPost,
  uploadFeedInlineImage,
} from "./feed-api";
import { isFeedFormValid } from "./feed-validation";
import type { FeedFilter, FeedPost } from "./types";
import type { FeedAudience, FeedAudienceScope, FeedViewerRole } from "./types";

type Props = {
  schoolSlug: string;
  childFullName: string;
  scopeLabel?: string;
  allowComposer?: boolean;
  viewerRole?: FeedViewerRole;
  viewScope?: "GENERAL" | "CLASS";
  currentClassId?: string;
  currentLevelId?: string;
  headingTitle?: string;
  hideSectionLabel?: boolean;
};

type ComposerMode = "POST" | "POLL";

type DraftAttachment = {
  id: string;
  file: File;
};

type EditableAttachment = {
  id: string;
  fileName: string;
  sizeLabel: string;
  fileUrl?: string;
};

const COMMENT_EMOJIS = ["😀", "👍", "❤️", "🎉", "👏"];
const STAFF_VIEW_FILTERS = [
  { key: "ALL", label: "Tous" },
  { key: "PARENTS", label: "Parents/eleves" },
  { key: "STAFF", label: "Staff" },
  { key: "LEVEL", label: "Niveau" },
  { key: "CLASS", label: "Classe" },
] as const;

type StaffViewFilterKey = (typeof STAFF_VIEW_FILTERS)[number]["key"];
type LevelOption = { id: string; label: string };
type ClassOption = { id: string; label: string; levelId: string };
const FEED_PAGE_SIZE = 12;

function isFeatured(post: FeedPost) {
  if (!post.featuredUntil) {
    return false;
  }
  return new Date(post.featuredUntil).getTime() > Date.now();
}

function getPromotedFeaturedIds(posts: FeedPost[]) {
  return posts
    .filter((post) => isFeatured(post))
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    .slice(0, 2)
    .map((post) => post.id);
}

function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso));
}

function normalizeCivility(value?: string) {
  if (!value) {
    return "";
  }
  const cleaned = value.replace(/\./g, "").trim();
  if (/^m$/i.test(cleaned)) {
    return "M";
  }
  if (/^mme$/i.test(cleaned)) {
    return "Mme";
  }
  if (/^mlle$/i.test(cleaned)) {
    return "Mlle";
  }
  return cleaned;
}

function formatAuthorDisplay(author: FeedPost["author"]) {
  const civility = normalizeCivility(author.civility);
  const rawName = author.fullName.replace(/^(m\.?|mme|mlle)\s+/i, "").trim();
  const parts = rawName.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] : first;
  const compact = `${first.charAt(0).toUpperCase()}.${last.toUpperCase()}`;
  return civility ? `${civility} ${compact}` : compact;
}

export function FamilyFeedPage({
  schoolSlug,
  childFullName,
  scopeLabel = "la vie scolaire",
  allowComposer = true,
  viewerRole = "PARENT",
  viewScope = "GENERAL",
  currentClassId,
  currentLevelId,
  headingTitle,
  hideSectionLabel = false,
}: Props) {
  const editorRef = useRef<RichTextEditorRef | null>(null);
  const editEditorRef = useRef<RichTextEditorRef | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>(() =>
    buildDemoFeed(schoolSlug),
  );
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [search, setSearch] = useState("");

  const [openComposerMode, setOpenComposerMode] = useState<ComposerMode | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [draftAttachments, setDraftAttachments] = useState<DraftAttachment[]>(
    [],
  );
  const [featuredDays, setFeaturedDays] = useState(0);
  const audienceOptions = useMemo(
    () =>
      getAudienceOptions(viewerRole, {
        classId: currentClassId,
        levelId: currentLevelId,
      }),
    [viewerRole, currentClassId, currentLevelId],
  );
  const [selectedAudienceScope, setSelectedAudienceScope] =
    useState<FeedAudienceScope>("SCHOOL_ALL");
  const [info, setInfo] = useState<string | null>(null);
  const [commentInputByPostId, setCommentInputByPostId] = useState<
    Record<string, string>
  >({});
  const [commentsOpenByPostId, setCommentsOpenByPostId] = useState<
    Record<string, boolean>
  >({});
  const [commentFormOpenByPostId, setCommentFormOpenByPostId] = useState<
    Record<string, boolean>
  >({});
  const classOptions = useMemo<ClassOption[]>(
    () => buildClassOptions(posts, currentClassId, currentLevelId),
    [posts, currentClassId, currentLevelId],
  );
  const levelOptions = useMemo<LevelOption[]>(
    () => buildLevelOptions(classOptions, posts, currentLevelId),
    [classOptions, posts, currentLevelId],
  );
  const [selectedAudienceLevelId, setSelectedAudienceLevelId] = useState(
    currentLevelId ?? levelOptions[0]?.id ?? "",
  );
  const [selectedAudienceClassId, setSelectedAudienceClassId] = useState(
    currentClassId ?? classOptions[0]?.id ?? "",
  );
  const [staffViewFilter, setStaffViewFilter] =
    useState<StaffViewFilterKey>("ALL");
  const [staffFilterLevelId, setStaffFilterLevelId] = useState(
    levelOptions[0]?.id ?? "",
  );
  const [staffFilterClassId, setStaffFilterClassId] = useState(
    classOptions[0]?.id ?? "",
  );
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBodyText, setEditBodyText] = useState("");
  const [editBodyHtml, setEditBodyHtml] = useState("");
  const [editPollQuestion, setEditPollQuestion] = useState("");
  const [editPollOptions, setEditPollOptions] = useState<string[]>(["", ""]);
  const [editAttachments, setEditAttachments] = useState<EditableAttachment[]>(
    [],
  );
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteCandidatePost, setDeleteCandidatePost] =
    useState<FeedPost | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);

  const loadFeedPage = useCallback(
    async (page: number, mode: "replace" | "append") => {
      const payload = await listFeedPosts(schoolSlug, {
        viewScope,
        classId: currentClassId,
        levelId: currentLevelId,
        filter,
        q: search.trim() || undefined,
        page,
        limit: FEED_PAGE_SIZE,
      });
      setCurrentPage(payload.meta.page);
      setHasMore(payload.meta.page < payload.meta.totalPages);
      setPosts((prev) => {
        if (mode === "replace") {
          return payload.items;
        }
        const byId = new Map<string, FeedPost>();
        prev.forEach((post) => byId.set(post.id, post));
        payload.items.forEach((post) => byId.set(post.id, post));
        return Array.from(byId.values());
      });
    },
    [schoolSlug, viewScope, currentClassId, currentLevelId, filter, search],
  );

  useEffect(() => {
    if (!canUseBackendFeed(viewerRole)) {
      return;
    }
    let cancelled = false;
    setSyncing(true);
    setLoadingMore(false);
    setCurrentPage(1);
    setHasMore(false);
    void loadFeedPage(1, "replace")
      .catch(() => {
        if (cancelled) {
          return;
        }
        setInfo(
          "Impossible de charger le fil depuis le serveur, affichage local.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setSyncing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    viewerRole,
    schoolSlug,
    viewScope,
    currentClassId,
    currentLevelId,
    filter,
    search,
    loadFeedPage,
  ]);

  const loadNextPage = useCallback(async () => {
    if (!canUseBackendFeed(viewerRole) || syncing || loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    try {
      await loadFeedPage(currentPage + 1, "append");
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [viewerRole, syncing, loadingMore, hasMore, loadFeedPage, currentPage]);

  useEffect(() => {
    if (!canUseBackendFeed(viewerRole)) {
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    const target = loadMoreRef.current;
    if (!target) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          void loadNextPage();
        }
      },
      { root: null, rootMargin: "300px 0px 300px 0px", threshold: 0.01 },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [viewerRole, loadNextPage]);

  const { filteredPosts, promotedFeaturedIds } = useMemo(() => {
    const term = search.trim().toLowerCase();
    const byVisibility = posts.filter((post) =>
      canViewerSeePost(post, viewerRole, {
        scope: viewScope,
        classId: currentClassId,
        levelId: currentLevelId,
      }),
    );
    const byFilter = byVisibility.filter((post) => {
      if (filter === "featured") {
        return isFeatured(post);
      }
      if (filter === "polls") {
        return post.type === "POLL";
      }
      if (filter === "mine") {
        return Boolean(post.authoredByViewer);
      }
      return true;
    });

    const byStaffScope = byFilter.filter((post) =>
      applyStaffAudienceFilter(post, {
        enabled: isStaff(viewerRole),
        key: staffViewFilter,
        levelId: staffFilterLevelId,
        classId: staffFilterClassId,
      }),
    );

    const filteredBySearch = !term
      ? byStaffScope
      : byStaffScope
          .filter((post) => {
            const haystack =
              `${post.title} ${post.author.fullName} ${post.bodyHtml}`.toLowerCase();
            return haystack.includes(term);
          })
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    const promotedIds = getPromotedFeaturedIds(filteredBySearch);
    const promotedSet = new Set(promotedIds);
    const promotedPosts = filteredBySearch
      .filter((post) => promotedSet.has(post.id))
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    const regularPosts = filteredBySearch
      .filter((post) => !promotedSet.has(post.id))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    return {
      filteredPosts: [...promotedPosts, ...regularPosts],
      promotedFeaturedIds: promotedSet,
    };
  }, [
    filter,
    posts,
    search,
    viewerRole,
    viewScope,
    currentClassId,
    currentLevelId,
    staffViewFilter,
    staffFilterLevelId,
    staffFilterClassId,
  ]);

  function resetComposer() {
    setTitle("");
    setBodyText("");
    setBodyHtml("");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setDraftAttachments([]);
    setFeaturedDays(0);
    setSelectedAudienceScope(audienceOptions[0]?.scope ?? "SCHOOL_ALL");
    setSelectedAudienceLevelId(currentLevelId ?? levelOptions[0]?.id ?? "");
    setSelectedAudienceClassId(currentClassId ?? classOptions[0]?.id ?? "");
    editorRef.current?.clear();
  }

  function getSelectedAudience(): FeedAudience {
    if (viewerRole === "STUDENT") {
      const targetClassId = currentClassId || selectedAudienceClassId;
      const selectedClass = classOptions.find(
        (entry) => entry.id === targetClassId,
      );
      return {
        scope: "CLASS",
        classId: targetClassId || undefined,
        levelId: selectedClass?.levelId,
        label: selectedClass
          ? `Classe ${selectedClass.label} (eleves, parents, enseignants)`
          : "Communaute de classe",
      };
    }

    if (viewerRole === "PARENT") {
      return {
        scope: "PARENTS_ONLY",
        label: "Parents uniquement",
      };
    }

    if (isStaff(viewerRole) && selectedAudienceScope === "CLASS") {
      const selectedClass = classOptions.find(
        (entry) => entry.id === selectedAudienceClassId,
      );
      return {
        scope: "CLASS",
        classId: selectedClass?.id,
        levelId: selectedClass?.levelId,
        label: selectedClass
          ? `Parents/eleves classe ${selectedClass.label}`
          : "Parents/eleves d'une classe",
      };
    }

    const matched = audienceOptions.find(
      (entry) => entry.scope === selectedAudienceScope,
    );
    return (
      matched ?? {
        scope: "SCHOOL_ALL",
        label: "Toute l'ecole",
      }
    );
  }

  function canPublish() {
    if (!openComposerMode) {
      return false;
    }
    return isFeedFormValid({
      type: openComposerMode,
      title,
      bodyText,
      pollQuestion,
      pollOptions,
    });
  }

  async function publishPost() {
    if (!canPublish() || !openComposerMode) {
      return;
    }

    const nowIso = new Date().toISOString();
    const featuredUntil =
      featuredDays > 0
        ? new Date(
            Date.now() + featuredDays * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null;

    const audience = getSelectedAudience();
    const attachments = draftAttachments.map((entry) => ({
      fileName: entry.file.name,
      sizeLabel: `${Math.max(1, Math.round(entry.file.size / 1024))} Ko`,
    }));
    try {
      const created = await createFeedPost(schoolSlug, {
        type: openComposerMode,
        title: title.trim(),
        bodyHtml,
        audienceScope: audience.scope,
        audienceLabel: audience.label,
        audienceClassId: audience.classId,
        audienceLevelId: audience.levelId,
        featuredDays,
        pollQuestion:
          openComposerMode === "POLL" ? pollQuestion.trim() : undefined,
        pollOptions:
          openComposerMode === "POLL"
            ? pollOptions.map((entry) => entry.trim()).filter(Boolean)
            : undefined,
        attachments,
      });
      setPosts((prev) => [created, ...prev]);
      setInfo(
        openComposerMode === "POLL"
          ? "Sondage publie."
          : "Publication ajoutee au fil.",
      );
    } catch {
      const newPost: FeedPost = {
        id: `local-${crypto.randomUUID()}`,
        type: openComposerMode,
        schoolSlug,
        author: {
          id: "current-user",
          fullName: "Equipe pedagogique",
          civility: viewerRole === "PARENT" ? "Mme" : "M.",
          roleLabel: openComposerMode === "POLL" ? "Sondage" : "Publication",
          avatarText: "EQ",
        },
        title: title.trim(),
        bodyHtml,
        createdAt: nowIso,
        featuredUntil,
        audience,
        attachments: draftAttachments.map((entry) => ({
          id: entry.id,
          fileName: entry.file.name,
          sizeLabel: `${Math.max(1, Math.round(entry.file.size / 1024))} Ko`,
        })),
        likedByViewer: false,
        likesCount: 0,
        authoredByViewer: true,
        canManage: true,
        comments: [],
        poll:
          openComposerMode === "POLL"
            ? {
                question: pollQuestion.trim(),
                votedOptionId: null,
                options: pollOptions
                  .map((entry) => entry.trim())
                  .filter(Boolean)
                  .map((label, index) => ({
                    id: `opt-${index + 1}`,
                    label,
                    votes: 0,
                  })),
              }
            : undefined,
      };
      setPosts((prev) => [newPost, ...prev]);
      setInfo("Publication en local uniquement (API indisponible).");
    }
    resetComposer();
    setOpenComposerMode(null);
  }

  function toggleComposer(mode: ComposerMode) {
    setOpenComposerMode((prev) => (prev === mode ? null : mode));
  }

  function closeEditForm() {
    setEditingPostId(null);
    setEditTitle("");
    setEditBodyText("");
    setEditBodyHtml("");
    setEditPollQuestion("");
    setEditPollOptions(["", ""]);
    setEditAttachments([]);
    editEditorRef.current?.clear();
  }

  function openEditForm(post: FeedPost) {
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditBodyHtml(post.bodyHtml);
    setEditBodyText(extractPlainText(post.bodyHtml));
    setEditPollQuestion(post.poll?.question ?? "");
    setEditPollOptions(
      post.poll?.options.map((option) => option.label) ?? ["", ""],
    );
    setEditAttachments(
      post.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        sizeLabel: attachment.sizeLabel,
      })),
    );
  }

  function onEditAttachmentPick(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    const rows = Array.from(files);
    setEditAttachments((prev) => {
      const next = [...prev];
      for (const file of rows) {
        if (!next.some((entry) => entry.fileName === file.name)) {
          next.push({
            id: `edit-${crypto.randomUUID()}`,
            fileName: file.name,
            sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} Ko`,
          });
        }
      }
      return next;
    });
  }

  function removeEditAttachment(attachmentId: string) {
    setEditAttachments((prev) =>
      prev.filter((attachment) => attachment.id !== attachmentId),
    );
  }

  function canSaveEdit(post: FeedPost) {
    return isFeedFormValid({
      type: post.type,
      title: editTitle,
      bodyText: editBodyText,
      pollQuestion: editPollQuestion,
      pollOptions: editPollOptions,
    });
  }

  async function saveEditedPost(post: FeedPost) {
    if (!canSaveEdit(post)) {
      return;
    }

    const featuredDays =
      post.featuredUntil && new Date(post.featuredUntil).getTime() > Date.now()
        ? Math.max(
            1,
            Math.ceil(
              (new Date(post.featuredUntil).getTime() - Date.now()) /
                (24 * 60 * 60 * 1000),
            ),
          )
        : 0;

    const payloadBase = {
      type: post.type,
      title: editTitle.trim(),
      bodyHtml: editBodyHtml,
      audienceScope: post.audience.scope,
      audienceLabel: post.audience.label,
      audienceClassId: post.audience.classId,
      audienceLevelId: post.audience.levelId,
      featuredDays,
      pollQuestion: post.type === "POLL" ? editPollQuestion.trim() : undefined,
      pollOptions:
        post.type === "POLL"
          ? editPollOptions.map((entry) => entry.trim()).filter(Boolean)
          : undefined,
    };
    const payload = {
      ...payloadBase,
      attachments: editAttachments.map((attachment) => ({
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        sizeLabel: attachment.sizeLabel,
      })),
    };

    setSavingEdit(true);
    try {
      const updated = await updateFeedPost(schoolSlug, post.id, payload);
      setPosts((prev) =>
        prev.map((entry) => (entry.id === post.id ? updated : entry)),
      );
      setInfo("Publication modifiee.");
      closeEditForm();
    } catch {
      setPosts((prev) =>
        prev.map((entry) =>
          entry.id === post.id
            ? {
                ...entry,
                title: payload.title,
                bodyHtml: payload.bodyHtml,
                attachments: editAttachments.map((attachment) => ({
                  id: attachment.id,
                  fileName: attachment.fileName,
                  fileUrl: attachment.fileUrl,
                  sizeLabel: attachment.sizeLabel,
                })),
                poll:
                  entry.type === "POLL" && entry.poll
                    ? {
                        ...entry.poll,
                        question: payload.pollQuestion ?? entry.poll.question,
                        options:
                          payload.pollOptions?.map((label, index) => ({
                            id:
                              entry.poll?.options[index]?.id ??
                              `option-${index + 1}`,
                            label,
                            votes: entry.poll?.options[index]?.votes ?? 0,
                          })) ?? entry.poll.options,
                      }
                    : entry.poll,
              }
            : entry,
        ),
      );
      setInfo("Publication modifiee en local uniquement.");
      closeEditForm();
    } finally {
      setSavingEdit(false);
    }
  }

  function requestDeletePost(post: FeedPost) {
    setDeleteCandidatePost(post);
  }

  async function confirmDeletePost() {
    if (!deleteCandidatePost) {
      return;
    }
    const targetPost = deleteCandidatePost;
    setDeletingPost(true);
    try {
      await deleteFeedPost(schoolSlug, targetPost.id);
    } catch {
      setInfo("Suppression locale uniquement (API indisponible).");
    } finally {
      setPosts((prev) => prev.filter((post) => post.id !== targetPost.id));
      if (editingPostId === targetPost.id) {
        closeEditForm();
      }
      setDeleteCandidatePost(null);
      setDeletingPost(false);
    }
  }

  function vote(postId: string, optionId: string) {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId || post.type !== "POLL" || !post.poll) {
          return post;
        }

        if (post.poll.votedOptionId) {
          return post;
        }

        return {
          ...post,
          poll: {
            ...post.poll,
            votedOptionId: optionId,
            options: post.poll.options.map((option) =>
              option.id === optionId
                ? { ...option, votes: option.votes + 1 }
                : option,
            ),
          },
        };
      }),
    );
  }

  async function toggleLike(postId: string) {
    try {
      const result = await toggleFeedLike(schoolSlug, postId);
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) {
            return post;
          }
          return {
            ...post,
            likedByViewer: result.liked,
            likesCount: result.likesCount,
          };
        }),
      );
      return;
    } catch {
      // fallback local only
    }

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        const nextLiked = !post.likedByViewer;
        return {
          ...post,
          likedByViewer: nextLiked,
          likesCount: Math.max(0, post.likesCount + (nextLiked ? 1 : -1)),
        };
      }),
    );
  }

  function updateCommentDraft(postId: string, value: string) {
    setCommentInputByPostId((prev) => ({
      ...prev,
      [postId]: value,
    }));
  }

  function appendEmoji(postId: string, emoji: string) {
    setCommentInputByPostId((prev) => ({
      ...prev,
      [postId]: `${prev[postId] ?? ""}${emoji}`,
    }));
  }

  async function addComment(postId: string) {
    const raw = (commentInputByPostId[postId] ?? "").trim();
    if (!raw) {
      return;
    }

    try {
      const result = await addFeedComment(schoolSlug, postId, raw);
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) {
            return post;
          }
          return {
            ...post,
            comments: [...post.comments, result.comment],
          };
        }),
      );
      setCommentInputByPostId((prev) => ({
        ...prev,
        [postId]: "",
      }));
      return;
    } catch {
      // fallback local only
    }

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        return {
          ...post,
          comments: [
            ...post.comments,
            {
              id: `comment-${crypto.randomUUID()}`,
              authorName: "Vous",
              text: raw,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      }),
    );

    setCommentInputByPostId((prev) => ({
      ...prev,
      [postId]: "",
    }));
  }

  function toggleComments(postId: string) {
    setCommentsOpenByPostId((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  }

  function toggleCommentForm(postId: string) {
    setCommentFormOpenByPostId((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  }

  function onAttachmentPick(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const rows = Array.from(files);
    setDraftAttachments((prev) => {
      const next = [...prev];
      for (const file of rows) {
        if (!next.some((entry) => entry.file.name === file.name)) {
          next.push({ id: crypto.randomUUID(), file });
        }
      }
      return next;
    });
  }

  return (
    <div className="grid gap-4">
      <section className="relative overflow-hidden rounded-card border border-primary/20 bg-gradient-to-br from-primary/10 via-surface to-surface p-4">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-success/20 blur-2xl" />
        <div className="relative grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {hideSectionLabel ? null : (
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Fil d'actualite famille
                </p>
              )}
              <h2 className="font-heading text-xl font-semibold text-text-primary">
                {headingTitle ??
                  `Bonjour, suivez ${scopeLabel} de ${childFullName}`}
              </h2>
            </div>
            {allowComposer ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={
                    openComposerMode === "POST" ? "secondary" : "primary"
                  }
                  iconLeft={<FileText className="h-4 w-4" />}
                  onClick={() => toggleComposer("POST")}
                  className="h-9 px-3"
                >
                  Publier une info
                </Button>
                <Button
                  variant={
                    openComposerMode === "POLL" ? "secondary" : "primary"
                  }
                  iconLeft={<Vote className="h-4 w-4" />}
                  onClick={() => toggleComposer("POLL")}
                  className="h-9 px-3"
                >
                  Realiser un sondage
                </Button>
              </div>
            ) : (
              <Badge
                variant="neutral"
                className="border-primary/30 text-primary"
              >
                {syncing
                  ? "Synchronisation..."
                  : `${filteredPosts.length} publication(s)`}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher dans le fil..."
              className="h-10 min-w-0 flex-1 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex shrink-0 items-center gap-2">
              <FilterButton
                label="Tous"
                active={filter === "all"}
                onClick={() => setFilter("all")}
                icon={<AlignJustify className="h-4 w-4" />}
                iconOnly
              />
              <FilterButton
                label="A la une"
                active={filter === "featured"}
                onClick={() => setFilter("featured")}
                icon={<Crown className="h-4 w-4" />}
                iconOnly
              />
              <FilterButton
                label="Sondages"
                active={filter === "polls"}
                onClick={() => setFilter("polls")}
                icon={<Vote className="h-4 w-4" />}
                iconOnly
              />
              <FilterButton
                label="Mes posts"
                active={filter === "mine"}
                onClick={() => setFilter("mine")}
                icon={<UserRound className="h-4 w-4" />}
                iconOnly
              />
            </div>
          </div>

          {isStaff(viewerRole) && viewScope === "GENERAL" ? (
            <div className="grid gap-2 rounded-card border border-border bg-background p-2 sm:grid-cols-[auto_180px_220px] sm:items-center">
              <div className="flex flex-wrap gap-2">
                {STAFF_VIEW_FILTERS.map((entry) => (
                  <FilterButton
                    key={entry.key}
                    label={entry.label}
                    active={staffViewFilter === entry.key}
                    onClick={() => setStaffViewFilter(entry.key)}
                  />
                ))}
              </div>
              {staffViewFilter === "LEVEL" || staffViewFilter === "CLASS" ? (
                <select
                  value={staffFilterLevelId}
                  onChange={(event) => {
                    const levelId = event.target.value;
                    setStaffFilterLevelId(levelId);
                    const firstClass = classOptions.find(
                      (entry) => entry.levelId === levelId,
                    );
                    if (firstClass) {
                      setStaffFilterClassId(firstClass.id);
                    }
                  }}
                  className="h-9 rounded-card border border-border bg-surface px-3 text-sm text-text-primary outline-none"
                >
                  {levelOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span />
              )}
              {staffViewFilter === "CLASS" ? (
                <select
                  value={staffFilterClassId}
                  onChange={(event) =>
                    setStaffFilterClassId(event.target.value)
                  }
                  className="h-9 rounded-card border border-border bg-surface px-3 text-sm text-text-primary outline-none"
                >
                  {classOptions
                    .filter((entry) => entry.levelId === staffFilterLevelId)
                    .map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                </select>
              ) : (
                <span />
              )}
            </div>
          ) : null}
        </div>
      </section>

      {allowComposer && openComposerMode ? (
        <section className="rounded-card border border-border bg-surface p-4 shadow-card">
          <div className="grid gap-3">
            <div
              className={`grid gap-2 ${
                viewerRole === "PARENT" || viewerRole === "STUDENT"
                  ? "sm:grid-cols-1"
                  : "sm:grid-cols-[1fr_260px]"
              }`}
            >
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={
                  openComposerMode === "POLL"
                    ? "Titre du sondage"
                    : "Titre de la publication"
                }
                className="h-10 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {viewerRole === "PARENT" || viewerRole === "STUDENT" ? null : (
                <select
                  value={selectedAudienceScope}
                  onChange={(event) =>
                    setSelectedAudienceScope(
                      event.target.value as FeedAudienceScope,
                    )
                  }
                  className="h-10 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {audienceOptions.map((entry) => (
                    <option key={entry.scope} value={entry.scope}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {isStaff(viewerRole) && selectedAudienceScope === "CLASS" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={selectedAudienceLevelId}
                  onChange={(event) => {
                    const nextLevelId = event.target.value;
                    setSelectedAudienceLevelId(nextLevelId);
                    const firstClass = classOptions.find(
                      (entry) => entry.levelId === nextLevelId,
                    );
                    if (firstClass) {
                      setSelectedAudienceClassId(firstClass.id);
                    }
                  }}
                  className="h-10 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {levelOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedAudienceClassId}
                  onChange={(event) =>
                    setSelectedAudienceClassId(event.target.value)
                  }
                  className="h-10 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {classOptions
                    .filter(
                      (entry) => entry.levelId === selectedAudienceLevelId,
                    )
                    .map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}

            <input
              readOnly
              value={`Public cible: ${getSelectedAudience().label}`}
              className="h-9 rounded-card border border-border bg-muted px-3 text-xs text-text-secondary"
            />

            <RichTextEditor
              ref={editorRef}
              initialHtml=""
              onTextChange={setBodyText}
              onHtmlChange={setBodyHtml}
              onUploadInlineImage={(file) =>
                uploadFeedInlineImage(schoolSlug, file)
              }
              minHeightClassName="min-h-[140px]"
              hint="Ajoutez du contexte, des points cles et des liens utiles pour les familles."
            />

            {openComposerMode === "POLL" ? (
              <div className="grid gap-2 rounded-card border border-border bg-background p-3">
                <input
                  value={pollQuestion}
                  onChange={(event) => setPollQuestion(event.target.value)}
                  placeholder="Question du sondage"
                  className="h-10 rounded-card border border-border bg-surface px-3 text-sm text-text-primary outline-none"
                />
                {pollOptions.map((option, index) => (
                  <input
                    key={`poll-option-${index + 1}`}
                    value={option}
                    onChange={(event) =>
                      setPollOptions((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? event.target.value : entry,
                        ),
                      )
                    }
                    placeholder={`Option ${index + 1}`}
                    className="h-10 rounded-card border border-border bg-surface px-3 text-sm text-text-primary outline-none"
                  />
                ))}
                {pollOptions.length < 5 ? (
                  <button
                    type="button"
                    onClick={() => setPollOptions((prev) => [...prev, ""])}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une option
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-2 p-0">
              <input
                type="file"
                multiple
                aria-label="Ajouter des pieces jointes a la publication"
                onChange={(event) => onAttachmentPick(event.target.files)}
              />
              {draftAttachments.length > 0 ? (
                <ul className="grid gap-1 text-sm text-text-secondary">
                  {draftAttachments.map((entry) => (
                    <li
                      key={entry.id}
                      className="inline-flex items-center gap-1"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {entry.file.name}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <CalendarDays className="h-4 w-4" />
                Mise en avant (jours)
                <select
                  value={featuredDays}
                  onChange={(event) =>
                    setFeaturedDays(Number(event.target.value))
                  }
                  className="h-8 rounded border border-border bg-background px-2"
                >
                  <option value={0}>Aucune</option>
                  <option value={1}>1 jour</option>
                  <option value={3}>3 jours</option>
                  <option value={5}>5 jours</option>
                  <option value={7}>7 jours</option>
                </select>
              </div>
              <Button
                onClick={publishPost}
                iconLeft={<Send className="h-4 w-4" />}
                disabled={!canPublish()}
                className="sm:justify-self-end"
              >
                Publier
              </Button>
            </div>
            {info ? <p className="text-sm text-success">{info}</p> : null}
          </div>
        </section>
      ) : null}

      <div className="grid gap-3">
        {syncing && filteredPosts.length === 0 ? (
          <>
            <FeedPostSkeleton />
            <FeedPostSkeleton />
          </>
        ) : null}
        {filteredPosts.map((post) => (
          <article
            key={post.id}
            className={`rounded-card border p-4 shadow-card ${
              promotedFeaturedIds.has(post.id)
                ? "border-amber-200 bg-amber-50/60"
                : "border-border bg-surface"
            }`}
          >
            <div
              className={`mb-3 flex items-start justify-between gap-3 border-b pb-3 ${
                promotedFeaturedIds.has(post.id)
                  ? "border-amber-200/80"
                  : "border-border/70"
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-[0.8rem] font-semibold uppercase tracking-wide text-primary">
                  {post.title}
                </p>
                <p className="text-[0.72rem] text-text-secondary">
                  {formatAuthorDisplay(post.author)} • {post.author.roleLabel} •{" "}
                  {formatDate(post.createdAt)}
                </p>
              </div>
              <div className="inline-flex items-center gap-2">
                <Badge
                  variant="neutral"
                  className="border-border text-text-secondary"
                >
                  {post.audience.label}
                </Badge>
                {promotedFeaturedIds.has(post.id) ? (
                  <Badge
                    variant="neutral"
                    className="border-amber-300 bg-amber-50 text-amber-700"
                    title="Publication mise en avant"
                    aria-label="Publication mise en avant"
                  >
                    <Crown className="h-3.5 w-3.5" />
                  </Badge>
                ) : null}
                {post.type === "POLL" ? (
                  <Badge
                    variant="neutral"
                    className="border-primary/30 text-primary"
                  >
                    SONDAGE
                  </Badge>
                ) : null}
              </div>
            </div>

            <div
              className="messaging-html mt-1.5 space-y-2 text-[0.95rem] leading-7 text-text-secondary [&_p]:my-2 [&_strong]:font-semibold [&_strong]:text-text-primary"
              dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
            />

            {post.attachments.length > 0 ? (
              <div className="mt-3 p-0">
                <ul className="grid gap-1 text-sm text-text-secondary">
                  {post.attachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="inline-flex items-center justify-between gap-2 rounded-card bg-primary/5 px-2 py-1"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5 text-primary" />
                        {attachment.fileUrl ? (
                          <a
                            href={attachment.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {attachment.fileName}
                          </a>
                        ) : (
                          attachment.fileName
                        )}
                      </span>
                      <span className="text-xs">{attachment.sizeLabel}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {post.type === "POLL" && post.poll ? (
              <div className="mt-3 rounded-card border border-primary/20 bg-primary/5 p-3">
                <p className="mb-2 text-sm font-semibold text-text-primary">
                  {post.poll.question}
                </p>
                <div className="grid gap-2">
                  {post.poll.options.map((option) => {
                    const totalVotes =
                      post.poll?.options.reduce(
                        (acc, entry) => acc + entry.votes,
                        0,
                      ) ?? 0;
                    const ratio =
                      totalVotes > 0
                        ? Math.round((option.votes / totalVotes) * 100)
                        : 0;
                    const selected = option.id === post.poll?.votedOptionId;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={Boolean(post.poll?.votedOptionId)}
                        onClick={() => vote(post.id, option.id)}
                        className={`relative overflow-hidden rounded-card border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:border-primary/50"
                        } disabled:cursor-not-allowed`}
                      >
                        <span className="relative z-10 flex items-center justify-between gap-2">
                          <span>{option.label}</span>
                          <span className="text-xs text-text-secondary">
                            {option.votes} vote(s)
                          </span>
                        </span>
                        <span
                          className="absolute inset-y-0 left-0 bg-primary/15"
                          style={{ width: `${ratio}%` }}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {editingPostId === post.id ? (
              <div className="mt-4 grid gap-3 rounded-card border border-primary/25 bg-primary/5 p-3">
                <input
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  placeholder="Titre de la publication"
                  className="h-10 rounded-card border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                <RichTextEditor
                  key={`edit-${post.id}`}
                  ref={editEditorRef}
                  initialHtml={post.bodyHtml}
                  onTextChange={setEditBodyText}
                  onHtmlChange={setEditBodyHtml}
                  onUploadInlineImage={(file) =>
                    uploadFeedInlineImage(schoolSlug, file)
                  }
                  minHeightClassName="min-h-[120px]"
                />

                {post.type === "POLL" ? (
                  <div className="grid gap-2 rounded-card border border-border bg-background p-3">
                    <input
                      value={editPollQuestion}
                      onChange={(event) =>
                        setEditPollQuestion(event.target.value)
                      }
                      placeholder="Question du sondage"
                      className="h-10 rounded-card border border-border bg-surface px-3 text-sm text-text-primary outline-none"
                    />
                    {editPollOptions.map((option, index) => (
                      <input
                        key={`edit-poll-option-${index + 1}`}
                        value={option}
                        onChange={(event) =>
                          setEditPollOptions((prev) =>
                            prev.map((entry, idx) =>
                              idx === index ? event.target.value : entry,
                            ),
                          )
                        }
                        placeholder={`Option ${index + 1}`}
                        className="h-10 rounded-card border border-border bg-surface px-3 text-sm text-text-primary outline-none"
                      />
                    ))}
                    {editPollOptions.length < 5 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setEditPollOptions((prev) => [...prev, ""])
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter une option
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-2 p-0">
                  <input
                    type="file"
                    multiple
                    aria-label="Modifier les pieces jointes de la publication"
                    onChange={(event) =>
                      onEditAttachmentPick(event.target.files)
                    }
                  />
                  {editAttachments.length > 0 ? (
                    <ul className="grid gap-1 text-sm text-text-secondary">
                      {editAttachments.map((attachment) => (
                        <li
                          key={attachment.id}
                          className="inline-flex items-center justify-between gap-2 rounded-card bg-primary/5 px-2 py-1"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Paperclip className="h-3.5 w-3.5 text-primary" />
                            {attachment.fileName}
                          </span>
                          <div className="inline-flex items-center gap-2">
                            <span className="text-xs">
                              {attachment.sizeLabel}
                            </span>
                            <button
                              type="button"
                              aria-label={`Supprimer ${attachment.fileName}`}
                              className="text-xs font-semibold text-notification hover:underline"
                              onClick={() =>
                                removeEditAttachment(attachment.id)
                              }
                            >
                              Retirer
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-text-secondary">
                      Aucune piece jointe.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeEditForm}
                    disabled={savingEdit}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    onClick={() => saveEditedPost(post)}
                    disabled={savingEdit || !canSaveEdit(post)}
                  >
                    {savingEdit ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 rounded-card border border-border/80 bg-background/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleLike(post.id)}
                    aria-label={
                      post.likedByViewer
                        ? `Retirer le like (${post.likesCount})`
                        : `Aimer (${post.likesCount})`
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-semibold shadow-sm transition ${
                      post.likedByViewer
                        ? "border-rose-300 bg-rose-100 text-rose-700"
                        : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300"
                    }`}
                  >
                    <Heart className="h-3.5 w-3.5" />
                    <span>{post.likesCount}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleComments(post.id)}
                    aria-label={
                      commentsOpenByPostId[post.id]
                        ? `Masquer les commentaires (${post.comments.length})`
                        : `Voir les commentaires (${post.comments.length})`
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-semibold shadow-sm transition ${
                      commentsOpenByPostId[post.id]
                        ? "border-sky-300 bg-sky-100 text-sky-700"
                        : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
                    }`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{post.comments.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCommentForm(post.id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-semibold shadow-sm transition ${
                      commentFormOpenByPostId[post.id]
                        ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {commentFormOpenByPostId[post.id]
                      ? "Masquer reaction"
                      : "Reagir"}
                  </button>
                </div>
                {post.canManage ? (
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(post)}
                      aria-label="Modifier la publication"
                      title="Modifier"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-primary/30 bg-primary/10 text-primary transition hover:bg-primary/20"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeletePost(post)}
                      aria-label="Supprimer la publication"
                      title="Supprimer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-notification/40 bg-notification/10 text-notification transition hover:bg-notification/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>

              {commentsOpenByPostId[post.id] ? (
                <div className="grid gap-2">
                  {post.comments.length > 0 ? (
                    post.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-card border border-border bg-surface px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-text-primary">
                          {comment.authorName}
                        </p>
                        <p className="text-sm text-text-primary">
                          {comment.text}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {formatDate(comment.createdAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-text-secondary">
                      Aucun commentaire pour le moment.
                    </p>
                  )}
                </div>
              ) : null}

              {commentFormOpenByPostId[post.id] ? (
                <div className="grid gap-2">
                  <textarea
                    value={commentInputByPostId[post.id] ?? ""}
                    onChange={(event) =>
                      updateCommentDraft(post.id, event.target.value)
                    }
                    placeholder="Ajouter un commentaire..."
                    className="min-h-[78px] rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1">
                      {COMMENT_EMOJIS.map((emoji) => (
                        <button
                          key={`${post.id}-${emoji}`}
                          type="button"
                          onClick={() => appendEmoji(post.id, emoji)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-sm"
                          aria-label={`Ajouter ${emoji}`}
                          title={`Ajouter ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <Button
                      onClick={() => addComment(post.id)}
                      disabled={!(commentInputByPostId[post.id] ?? "").trim()}
                      className="h-8 px-3"
                    >
                      Commenter
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        ))}
        {canUseBackendFeed(viewerRole) ? (
          <div ref={loadMoreRef} className="flex justify-center py-2">
            {loadingMore ? (
              <div className="grid w-full gap-3">
                <FeedPostSkeleton compact />
                <FeedPostSkeleton compact />
              </div>
            ) : hasMore ? (
              <span className="text-xs text-text-secondary/80">
                Faites defiler pour charger plus
              </span>
            ) : (
              <span className="text-xs text-text-secondary/70">Fin du fil</span>
            )}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(deleteCandidatePost)}
        title="Supprimer la publication ?"
        message={
          deleteCandidatePost
            ? `Cette action est definitive. Publication: "${deleteCandidatePost.title}".`
            : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        loading={deletingPost}
        onCancel={() => {
          if (!deletingPost) {
            setDeleteCandidatePost(null);
          }
        }}
        onConfirm={confirmDeletePost}
      />
    </div>
  );
}

function extractPlainText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function FeedPostSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <article
      aria-hidden="true"
      className={`animate-pulse rounded-card border border-border bg-surface p-4 shadow-card ${
        compact ? "opacity-80" : ""
      }`}
    >
      <div className="mb-3 grid gap-2 border-b border-border/70 pb-3">
        <div className="h-3 w-2/5 rounded bg-muted" />
        <div className="h-2.5 w-1/3 rounded bg-muted" />
      </div>
      <div className="grid gap-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-11/12 rounded bg-muted" />
        <div className="h-3 w-8/12 rounded bg-muted" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-8 w-16 rounded-full bg-muted" />
        <div className="h-8 w-16 rounded-full bg-muted" />
        <div className="h-8 w-20 rounded-full bg-muted" />
      </div>
    </article>
  );
}

function isStaff(role: FeedViewerRole) {
  return (
    role === "SCHOOL_ADMIN" ||
    role === "SCHOOL_MANAGER" ||
    role === "SUPERVISOR" ||
    role === "SCHOOL_ACCOUNTANT" ||
    role === "SCHOOL_STAFF" ||
    role === "TEACHER"
  );
}

function getAudienceOptions(
  role: FeedViewerRole,
  context: { classId?: string; levelId?: string },
): FeedAudience[] {
  if (role === "STUDENT") {
    return [
      {
        scope: "CLASS",
        classId: context.classId,
        levelId: context.levelId,
        label: "Classe (eleves, parents, enseignants)",
      },
    ];
  }

  if (role === "PARENT") {
    return [{ scope: "PARENTS_ONLY", label: "Parents uniquement" }];
  }

  if (isStaff(role)) {
    return [
      { scope: "PARENTS_STUDENTS", label: "Parents et eleves (ecole)" },
      { scope: "CLASS", label: "Parents et eleves d'une classe" },
      { scope: "STAFF_ONLY", label: "Staff uniquement" },
    ];
  }

  return [{ scope: "SCHOOL_ALL", label: "Toute l'ecole" }];
}

function canViewerSeePost(
  post: FeedPost,
  role: FeedViewerRole,
  context: { scope: "GENERAL" | "CLASS"; classId?: string; levelId?: string },
) {
  if (context.scope === "GENERAL" && isStaff(role)) {
    return true;
  }

  if (context.scope === "CLASS") {
    return (
      post.audience.scope === "CLASS" &&
      Boolean(context.classId) &&
      post.audience.classId === context.classId
    );
  }

  if (post.audience.scope === "SCHOOL_ALL") {
    return true;
  }

  if (post.audience.scope === "STAFF_ONLY") {
    return isStaff(role);
  }

  if (post.audience.scope === "PARENTS_STUDENTS") {
    return role === "PARENT" || role === "STUDENT";
  }

  if (post.audience.scope === "PARENTS_ONLY") {
    return role === "PARENT";
  }

  if (post.audience.scope === "LEVEL") {
    if (!context.levelId || !post.audience.levelId) {
      return false;
    }
    return context.levelId === post.audience.levelId;
  }

  if (post.audience.scope === "CLASS") {
    if (!context.classId || !post.audience.classId) {
      return false;
    }
    return context.classId === post.audience.classId;
  }

  return false;
}

function buildClassOptions(
  posts: FeedPost[],
  currentClassId?: string,
  currentLevelId?: string,
): ClassOption[] {
  const defaults: ClassOption[] = [
    { id: "class-6a", label: "6eme A", levelId: "level-6e" },
    { id: "class-6b", label: "6eme B", levelId: "level-6e" },
    { id: "class-6c", label: "6eme C", levelId: "level-6e" },
    { id: "class-5a", label: "5eme A", levelId: "level-5e" },
  ];

  const derived = posts
    .filter((post) => post.audience.scope === "CLASS" && post.audience.classId)
    .map((post) => ({
      id: post.audience.classId as string,
      label:
        post.audience.label.replace("Parents/eleves classe ", "") ||
        post.audience.classId ||
        "Classe",
      levelId: post.audience.levelId || "level-6e",
    }));

  const all = [...defaults, ...derived];
  if (currentClassId && !all.some((entry) => entry.id === currentClassId)) {
    all.push({
      id: currentClassId,
      label: "Classe actuelle",
      levelId: currentLevelId || "level-current",
    });
  }

  const byId = new Map<string, ClassOption>();
  all.forEach((entry) => {
    if (!byId.has(entry.id)) {
      byId.set(entry.id, entry);
    }
  });
  return Array.from(byId.values());
}

function buildLevelOptions(
  classOptions: ClassOption[],
  posts: FeedPost[],
  currentLevelId?: string,
): LevelOption[] {
  const levelsFromClass = classOptions.map((entry) => ({
    id: entry.levelId,
    label: levelLabel(entry.levelId),
  }));
  const levelsFromPosts = posts
    .filter((post) => post.audience.scope === "LEVEL" && post.audience.levelId)
    .map((post) => ({
      id: post.audience.levelId as string,
      label: post.audience.label || levelLabel(post.audience.levelId as string),
    }));
  const all = [...levelsFromClass, ...levelsFromPosts];
  if (currentLevelId && !all.some((entry) => entry.id === currentLevelId)) {
    all.push({ id: currentLevelId, label: levelLabel(currentLevelId) });
  }

  const byId = new Map<string, LevelOption>();
  all.forEach((entry) => {
    if (!byId.has(entry.id)) {
      byId.set(entry.id, entry);
    }
  });

  return Array.from(byId.values());
}

function levelLabel(levelId: string) {
  if (levelId === "level-6e") return "6eme";
  if (levelId === "level-5e") return "5eme";
  if (levelId === "level-4e") return "4eme";
  if (levelId === "level-3e") return "3eme";
  return "Niveau";
}

function applyStaffAudienceFilter(
  post: FeedPost,
  filter: {
    enabled: boolean;
    key: StaffViewFilterKey;
    levelId: string;
    classId: string;
  },
) {
  if (!filter.enabled) {
    return true;
  }

  if (filter.key === "ALL") {
    return true;
  }

  if (filter.key === "STAFF") {
    return post.audience.scope === "STAFF_ONLY";
  }

  if (filter.key === "PARENTS") {
    return (
      post.audience.scope === "PARENTS_STUDENTS" ||
      post.audience.scope === "PARENTS_ONLY" ||
      post.audience.scope === "CLASS"
    );
  }

  if (filter.key === "LEVEL") {
    return (
      post.audience.scope === "LEVEL" &&
      post.audience.levelId === filter.levelId
    );
  }

  if (filter.key === "CLASS") {
    return (
      post.audience.scope === "CLASS" &&
      post.audience.classId === filter.classId
    );
  }

  return true;
}

function FilterButton({
  label,
  active,
  onClick,
  icon,
  iconOnly = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-card border text-sm font-semibold transition ${
        iconOnly ? "h-10 w-10 px-0" : "h-10 px-3"
      } ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-text-secondary hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      {iconOnly ? (
        <span className="inline-flex items-center justify-center">{icon}</span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      )}
    </button>
  );
}
