"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import {
  BookOpen,
  CircleHelp,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import { FormField } from "../ui/form-field";
import { FormRichTextEditor } from "../ui/form-rich-text-editor";
import { FormSelect, FormTextInput, FormTextarea } from "../ui/form-controls";
import {
  type HelpChapterItem,
  type HelpGuideAudience,
  type HelpGuideItem,
  type HelpPlanNode,
  type HelpPublicationStatus,
  helpGuidesApi,
} from "./help-guides-api";

const AUDIENCE_OPTIONS: Array<{ value: HelpGuideAudience; label: string }> = [
  { value: "PARENT", label: "Parent" },
  { value: "TEACHER", label: "Teacher" },
  { value: "STUDENT", label: "Student" },
  { value: "SCHOOL_ADMIN", label: "Admin école" },
  { value: "STAFF", label: "Staff" },
];

const STATUS_OPTIONS: Array<{ value: HelpPublicationStatus; label: string }> = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "PUBLISHED", label: "Publié" },
  { value: "ARCHIVED", label: "Archivé" },
];

const guideFormSchema = z.object({
  title: z.string().min(3, "Titre requis"),
  audience: z.enum(["PARENT", "TEACHER", "STUDENT", "SCHOOL_ADMIN", "STAFF"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  description: z.string().max(300, "300 caractères max").optional(),
  schoolId: z.string().optional(),
});

const chapterFormSchema = z
  .object({
    title: z.string().min(3, "Titre requis"),
    parentId: z.string().optional(),
    orderIndex: z.number().int().min(0),
    summary: z.string().max(500, "500 caractères max").optional(),
    contentType: z.enum(["RICH_TEXT", "VIDEO"]),
    contentHtml: z.string().optional(),
    videoUrl: z.string().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  })
  .superRefine((value, ctx) => {
    if (
      value.contentType === "RICH_TEXT" &&
      (!value.contentHtml || value.contentHtml.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentHtml"],
        message: "Le contenu du chapitre est requis",
      });
    }

    if (
      value.contentType === "VIDEO" &&
      (!value.videoUrl || value.videoUrl.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["videoUrl"],
        message: "L'URL vidéo est requise",
      });
    }
  });

type GuideFormValues = z.infer<typeof guideFormSchema>;
type ChapterFormValues = z.infer<typeof chapterFormSchema>;

function flattenPlan(nodes: HelpPlanNode[]): HelpPlanNode[] {
  const result: HelpPlanNode[] = [];

  function walk(items: HelpPlanNode[]) {
    for (const node of items) {
      result.push(node);
      walk(node.children);
    }
  }

  walk(nodes);
  return result;
}

type AssistanceGuidePanelProps = {
  canManageOverride?: boolean;
};

export function AssistanceGuidePanel({
  canManageOverride = true,
}: AssistanceGuidePanelProps) {
  const [canManage, setCanManage] = useState(false);
  const [guide, setGuide] = useState<HelpGuideItem | null>(null);
  const [plan, setPlan] = useState<HelpPlanNode[]>([]);
  const [currentChapter, setCurrentChapter] = useState<HelpChapterItem | null>(
    null,
  );
  const [adminGuides, setAdminGuides] = useState<HelpGuideItem[]>([]);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<HelpChapterItem[]>([]);
  const [expandedChapterIds, setExpandedChapterIds] = useState<string[]>([]);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [compactView, setCompactView] = useState<"plan" | "content">("plan");
  const [loading, setLoading] = useState(true);
  const [savingGuide, setSavingGuide] = useState(false);
  const [savingChapter, setSavingChapter] = useState(false);
  const [editingChapter, setEditingChapter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guideForm = useForm<GuideFormValues>({
    resolver: zodResolver(guideFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      audience: "PARENT",
      status: "DRAFT",
      description: "",
      schoolId: "",
    },
  });

  const chapterForm = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      parentId: "",
      orderIndex: 0,
      summary: "",
      contentType: "RICH_TEXT",
      contentHtml: "",
      videoUrl: "",
      status: "DRAFT",
    },
  });

  const flattenedPlan = useMemo(() => flattenPlan(plan), [plan]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const media = window.matchMedia("(max-width: 1023px)");
    const applyMode = () => {
      const compact = media.matches;
      setIsCompactLayout(compact);
      if (!compact) {
        setCompactView("plan");
      }
    };

    applyMode();
    media.addEventListener("change", applyMode);
    return () => media.removeEventListener("change", applyMode);
  }, []);

  function toggleChapter(chapterId: string) {
    setExpandedChapterIds((current) =>
      current.includes(chapterId)
        ? current.filter((id) => id !== chapterId)
        : [...current, chapterId],
    );
  }

  const loadAdminGuides = useCallback(async () => {
    const result = await helpGuidesApi.listAdmin();
    setAdminGuides(result.items);
  }, []);

  const loadGuideData = useCallback(
    async (guideId?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const current = await helpGuidesApi.getCurrent({
          ...(guideId ? { guideId } : {}),
        });
        const effectiveCanManage = current.canManage && canManageOverride;
        setCanManage(effectiveCanManage);
        setGuide(current.guide);

        const effectiveGuideId = guideId ?? current.guide?.id ?? null;
        if (effectiveGuideId) {
          setActiveGuideId(effectiveGuideId);
        }

        const planResponse = await helpGuidesApi.getPlan({
          ...(effectiveGuideId ? { guideId: effectiveGuideId } : {}),
        });
        setPlan(planResponse.items);
        setExpandedChapterIds([]);
        setCompactView("plan");

        const firstChapterId = flattenPlan(planResponse.items)[0]?.id;
        if (firstChapterId) {
          const chapterResponse = await helpGuidesApi.getChapter(
            firstChapterId,
            {
              ...(effectiveGuideId ? { guideId: effectiveGuideId } : {}),
            },
          );
          setCurrentChapter(chapterResponse.chapter);
        } else {
          setCurrentChapter(null);
        }

        if (effectiveCanManage) {
          await loadAdminGuides();
        } else {
          setAdminGuides([]);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger le guide",
        );
      } finally {
        setLoading(false);
      }
    },
    [canManageOverride, loadAdminGuides],
  );

  useEffect(() => {
    void loadGuideData();
  }, [loadGuideData]);

  const openChapter = useCallback(
    async (chapterId: string) => {
      try {
        const result = await helpGuidesApi.getChapter(chapterId, {
          ...(activeGuideId ? { guideId: activeGuideId } : {}),
        });
        setCurrentChapter(result.chapter);
        setEditingChapter(false);
        if (isCompactLayout) {
          setCompactView("content");
        }
      } catch (chapterError) {
        setError(
          chapterError instanceof Error
            ? chapterError.message
            : "Impossible de charger le chapitre",
        );
      }
    },
    [activeGuideId, isCompactLayout],
  );

  useEffect(() => {
    if (!currentChapter) return;

    chapterForm.reset({
      title: currentChapter.title,
      parentId: currentChapter.parentId ?? "",
      orderIndex: currentChapter.orderIndex,
      summary: currentChapter.summary ?? "",
      contentType: currentChapter.contentType,
      contentHtml: currentChapter.contentHtml ?? "",
      videoUrl: currentChapter.videoUrl ?? "",
      status: currentChapter.status,
    });
  }, [currentChapter, chapterForm]);

  async function handleSearch() {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await helpGuidesApi.search(search.trim(), {
        ...(activeGuideId ? { guideId: activeGuideId } : {}),
      });
      setSearchResults(result.items);
      setCompactView("plan");
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Recherche impossible",
      );
    }
  }

  async function handleCreateGuide(values: GuideFormValues) {
    setSavingGuide(true);
    setError(null);
    try {
      const created = await helpGuidesApi.createGuide({
        title: values.title,
        audience: values.audience,
        status: values.status,
        description: values.description?.trim() || undefined,
        schoolId: values.schoolId?.trim() || undefined,
      });
      guideForm.reset({ ...values, title: "", description: "", schoolId: "" });
      setActiveGuideId(created.id);
      await loadGuideData(created.id);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible de créer le guide",
      );
    } finally {
      setSavingGuide(false);
    }
  }

  async function handleSaveChapter(values: ChapterFormValues) {
    if (!activeGuideId) {
      setError("Aucun guide sélectionné");
      return;
    }

    setSavingChapter(true);
    setError(null);

    try {
      const payload = {
        title: values.title,
        parentId: values.parentId?.trim() || undefined,
        orderIndex: values.orderIndex,
        summary: values.summary?.trim() || undefined,
        contentType: values.contentType,
        contentHtml:
          values.contentType === "RICH_TEXT"
            ? values.contentHtml?.trim() || undefined
            : undefined,
        contentJson:
          values.contentType === "RICH_TEXT" && values.contentHtml?.trim()
            ? { html: values.contentHtml }
            : undefined,
        videoUrl:
          values.contentType === "VIDEO"
            ? values.videoUrl?.trim() || undefined
            : undefined,
        status: values.status,
      };

      let savedChapter: HelpChapterItem;
      if (editingChapter && currentChapter) {
        savedChapter = await helpGuidesApi.updateChapter(
          currentChapter.id,
          payload,
        );
      } else {
        savedChapter = await helpGuidesApi.createChapter(
          activeGuideId,
          payload,
        );
      }

      await loadGuideData(activeGuideId);
      await openChapter(savedChapter.id);
      setEditingChapter(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible d'enregistrer le chapitre",
      );
    } finally {
      setSavingChapter(false);
    }
  }

  async function handleDeleteChapter() {
    if (!currentChapter) return;
    if (!window.confirm("Supprimer ce chapitre ?")) return;

    try {
      await helpGuidesApi.deleteChapter(currentChapter.id);
      await loadGuideData(activeGuideId);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Suppression impossible",
      );
    }
  }

  async function handleDeleteGuide() {
    if (!activeGuideId) return;
    if (!window.confirm("Supprimer ce guide et tous ses chapitres ?")) return;

    try {
      await helpGuidesApi.deleteGuide(activeGuideId);
      setActiveGuideId(null);
      await loadGuideData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Suppression impossible",
      );
    }
  }

  if (loading) {
    return (
      <section className="flex min-h-[300px] items-center justify-center rounded-[20px] border border-warm-border bg-surface p-5 shadow-card">
        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
      </section>
    );
  }

  return (
    <section className="space-y-3" data-testid="assistance-guide-panel">
      <div className="rounded-[20px] border border-warm-border bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-text-primary">
              {guide?.title ?? "Guide utilisateur"}
            </h2>
          </div>
          {canManage ? (
            <div className="flex items-center gap-2">
              <FormSelect
                value={activeGuideId ?? ""}
                onChange={(event) => {
                  const nextGuideId = event.target.value;
                  setActiveGuideId(nextGuideId || null);
                  void loadGuideData(nextGuideId || undefined);
                }}
                className="min-w-[220px] py-2 text-xs"
              >
                <option value="">Guide auto (audience)</option>
                {adminGuides.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} · {item.audience}
                  </option>
                ))}
              </FormSelect>
              <button
                type="button"
                onClick={() => void loadGuideData(activeGuideId)}
                className="inline-flex items-center gap-1 rounded-[12px] border border-warm-border bg-warm-surface px-3 py-2 text-xs font-semibold text-text-secondary"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recharger
              </button>
              {activeGuideId ? (
                <button
                  type="button"
                  onClick={() => void handleDeleteGuide()}
                  className="inline-flex items-center gap-1 rounded-[12px] border border-notification/35 bg-notification/10 px-3 py-2 text-xs font-semibold text-notification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer guide
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[12px] border border-warm-border bg-warm-surface px-3 py-2">
            <Search className="h-4 w-4 text-text-secondary" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un chapitre"
              className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSearch()}
            className="rounded-[12px] bg-primary px-3 py-2 text-xs font-semibold text-white"
          >
            Rechercher
          </button>
          <button
            type="button"
            onClick={() => setSearchResults([])}
            className="rounded-[12px] border border-warm-border bg-warm-surface px-3 py-2 text-xs font-semibold text-text-secondary"
          >
            Plan
          </button>
        </div>

        {error ? (
          <p className="mt-3 rounded-[12px] border border-notification/35 bg-notification/10 px-3 py-2 text-xs text-notification">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        {(!isCompactLayout || compactView === "plan") && (
          <aside className="rounded-[20px] border border-warm-border bg-surface p-3 shadow-card">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {searchResults.length > 0 ? "Résultats" : "Plan du guide"}
            </p>

            <div className="space-y-1">
              {searchResults.length > 0
                ? searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => void openChapter(result.id)}
                      className={`flex w-full items-center rounded-[10px] px-2 py-2 text-left text-sm transition ${
                        currentChapter?.id === result.id
                          ? "bg-primary/10 text-primary"
                          : "text-text-secondary hover:bg-warm-highlight/70 hover:text-text-primary"
                      }`}
                    >
                      <span className="line-clamp-2">
                        {result.breadcrumb?.join(" > ") ?? result.title}
                      </span>
                    </button>
                  ))
                : plan.map((node) => {
                    const hasChildren = node.children.length > 0;
                    const isExpanded = expandedChapterIds.includes(node.id);
                    return (
                      <div key={node.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (hasChildren) {
                              toggleChapter(node.id);
                              return;
                            }
                            void openChapter(node.id);
                          }}
                          className="flex w-full items-center justify-between rounded-[10px] px-2 py-2 text-left text-sm text-text-primary transition hover:bg-warm-highlight/70"
                        >
                          <span className="line-clamp-2 font-medium">
                            {node.title}
                          </span>
                          {hasChildren ? (
                            <span className="text-xs text-text-secondary">
                              {isExpanded ? "Masquer" : "Voir"}
                            </span>
                          ) : null}
                        </button>

                        {isExpanded &&
                          node.children.map((child) => (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => void openChapter(child.id)}
                              className={`flex w-full items-center rounded-[10px] px-2 py-2 pl-6 text-left text-sm transition ${
                                currentChapter?.id === child.id
                                  ? "bg-primary/10 text-primary"
                                  : "text-text-secondary hover:bg-warm-highlight/70 hover:text-text-primary"
                              }`}
                            >
                              <span className="line-clamp-2">
                                {child.title}
                              </span>
                            </button>
                          ))}
                      </div>
                    );
                  })}
            </div>
          </aside>
        )}

        {(!isCompactLayout || compactView === "content") && (
          <div className="space-y-3">
            <article className="rounded-[20px] border border-warm-border bg-surface p-4 shadow-card">
              {isCompactLayout ? (
                <button
                  type="button"
                  onClick={() => setCompactView("plan")}
                  className="mb-3 rounded-[10px] border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
                  data-testid="assistance-guide-back-to-plan-web"
                >
                  Retour au plan
                </button>
              ) : null}
              {currentChapter ? (
                <>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-text-primary">
                      {currentChapter.title}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        currentChapter.status === "PUBLISHED"
                          ? "bg-green-100 text-green-700"
                          : currentChapter.status === "DRAFT"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {currentChapter.status}
                    </span>
                  </div>
                  {currentChapter.summary ? (
                    <p className="mb-3 text-sm text-text-secondary">
                      {currentChapter.summary}
                    </p>
                  ) : null}

                  {currentChapter.contentType === "VIDEO" ? (
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 rounded-[10px] border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
                        <Video className="h-4 w-4" />
                        Chapitre vidéo
                      </div>
                      {currentChapter.videoUrl ? (
                        <iframe
                          title={currentChapter.title}
                          src={currentChapter.videoUrl}
                          className="min-h-[260px] w-full rounded-[12px] border border-warm-border"
                          allowFullScreen
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none text-text-primary"
                      dangerouslySetInnerHTML={{
                        __html:
                          currentChapter.contentHtml || "<p>Aucun contenu.</p>",
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="flex min-h-[220px] items-center justify-center text-sm text-text-secondary">
                  Sélectionnez un chapitre dans le plan.
                </div>
              )}
            </article>

            {canManage ? (
              <div
                className="grid gap-3 xl:grid-cols-2"
                data-testid="assistance-guide-admin-forms"
              >
                <form
                  onSubmit={guideForm.handleSubmit(
                    (values: GuideFormValues) => void handleCreateGuide(values),
                  )}
                  className="rounded-[20px] border border-warm-border bg-surface p-4 shadow-card"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <CircleHelp className="h-4 w-4 text-primary" />
                    <p className="text-sm font-bold text-text-primary">
                      Créer un guide
                    </p>
                  </div>

                  <div className="space-y-2">
                    <FormField
                      label="Titre"
                      error={guideForm.formState.errors.title?.message}
                    >
                      <FormTextInput
                        {...guideForm.register("title")}
                        invalid={Boolean(guideForm.formState.errors.title)}
                        placeholder="Guide parent"
                      />
                    </FormField>

                    <FormField label="Audience">
                      <FormSelect {...guideForm.register("audience")}>
                        {AUDIENCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>

                    <FormField label="Statut">
                      <FormSelect {...guideForm.register("status")}>
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>

                    <FormField label="Description">
                      <FormTextarea
                        {...guideForm.register("description")}
                        rows={2}
                      />
                    </FormField>

                    <FormField label="School ID (optionnel)">
                      <FormTextInput
                        {...guideForm.register("schoolId")}
                        placeholder="guide global si vide"
                      />
                    </FormField>

                    <button
                      type="submit"
                      disabled={!guideForm.formState.isValid || savingGuide}
                      className="inline-flex items-center gap-2 rounded-[12px] bg-primary px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingGuide ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Créer le guide
                    </button>
                  </div>
                </form>

                <form
                  onSubmit={chapterForm.handleSubmit(
                    (values: ChapterFormValues) =>
                      void handleSaveChapter(values),
                  )}
                  className="rounded-[20px] border border-warm-border bg-surface p-4 shadow-card"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-text-primary">
                      {editingChapter
                        ? "Modifier le chapitre"
                        : "Créer un chapitre"}
                    </p>
                    {currentChapter ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingChapter((value) => !value)}
                          className="rounded-[10px] border border-warm-border bg-warm-surface px-2 py-1 text-[11px] font-semibold text-text-secondary"
                        >
                          {editingChapter ? "Nouveau" : "Éditer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteChapter()}
                          className="rounded-[10px] border border-notification/35 bg-notification/10 px-2 py-1 text-[11px] font-semibold text-notification"
                        >
                          Supprimer
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <FormField
                      label="Titre"
                      error={chapterForm.formState.errors.title?.message}
                    >
                      <FormTextInput
                        {...chapterForm.register("title")}
                        invalid={Boolean(chapterForm.formState.errors.title)}
                      />
                    </FormField>

                    <FormField label="Parent">
                      <FormSelect {...chapterForm.register("parentId")}>
                        <option value="">Aucun (chapitre racine)</option>
                        {flattenedPlan
                          .filter((node) => node.id !== currentChapter?.id)
                          .map((node) => (
                            <option key={node.id} value={node.id}>
                              {`${"-".repeat(node.depth)} ${node.title}`}
                            </option>
                          ))}
                      </FormSelect>
                    </FormField>

                    <div className="grid gap-2 md:grid-cols-3">
                      <FormField label="Ordre">
                        <FormTextInput
                          type="number"
                          {...chapterForm.register("orderIndex", {
                            valueAsNumber: true,
                          })}
                        />
                      </FormField>
                      <FormField label="Type">
                        <FormSelect {...chapterForm.register("contentType")}>
                          <option value="RICH_TEXT">Texte riche</option>
                          <option value="VIDEO">Vidéo</option>
                        </FormSelect>
                      </FormField>
                      <FormField label="Statut">
                        <FormSelect {...chapterForm.register("status")}>
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </FormSelect>
                      </FormField>
                    </div>

                    <FormField label="Résumé">
                      <FormTextarea
                        {...chapterForm.register("summary")}
                        rows={2}
                      />
                    </FormField>

                    {chapterForm.watch("contentType") === "VIDEO" ? (
                      <FormField
                        label="URL vidéo"
                        error={chapterForm.formState.errors.videoUrl?.message}
                      >
                        <FormTextInput
                          {...chapterForm.register("videoUrl")}
                          invalid={Boolean(
                            chapterForm.formState.errors.videoUrl,
                          )}
                          placeholder="https://..."
                        />
                      </FormField>
                    ) : (
                      <Controller
                        control={chapterForm.control}
                        name="contentHtml"
                        render={({ field }) => (
                          <FormRichTextEditor
                            label="Contenu"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onUploadInlineImage={(file) =>
                              helpGuidesApi.uploadInlineImage(file)
                            }
                            onUploadInlineVideo={(file) =>
                              helpGuidesApi.uploadInlineVideo(file)
                            }
                            error={
                              chapterForm.formState.errors.contentHtml?.message
                            }
                            invalid={Boolean(
                              chapterForm.formState.errors.contentHtml,
                            )}
                            hint="Le contenu accepte les images inline."
                            allowInlineImages
                            allowInlineVideos
                          />
                        )}
                      />
                    )}

                    <button
                      type="submit"
                      disabled={
                        !chapterForm.formState.isValid ||
                        savingChapter ||
                        !activeGuideId
                      }
                      className="inline-flex items-center gap-2 rounded-[12px] bg-primary px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingChapter ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {editingChapter ? "Mettre à jour" : "Créer le chapitre"}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
