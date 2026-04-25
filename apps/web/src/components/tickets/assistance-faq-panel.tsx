"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import {
  BookOpenText,
  ChevronDown,
  CircleHelp,
  Layers3,
  Plus,
  Save,
  Search,
  School,
  Sparkles,
  Trash2,
} from "lucide-react";
import { FormField } from "../ui/form-field";
import { FormRichTextEditor } from "../ui/form-rich-text-editor";
import { FormSelect, FormTextInput, FormTextarea } from "../ui/form-controls";
import {
  type HelpFaq,
  type HelpFaqAudience,
  type HelpFaqItem,
  type HelpFaqScopeType,
  type HelpFaqSourceWithThemes,
  type HelpFaqTheme,
  type HelpPublicationStatus,
  helpFaqsApi,
} from "./help-faqs-api";

const AUDIENCE_OPTIONS: Array<{ value: HelpFaqAudience; label: string }> = [
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

const faqFormSchema = z.object({
  title: z.string().min(3, "Titre requis"),
  audience: z.enum(["PARENT", "TEACHER", "STUDENT", "SCHOOL_ADMIN", "STAFF"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  description: z.string().max(300, "300 caractères max").optional(),
});

const themeFormSchema = z.object({
  title: z.string().min(3, "Titre requis"),
  orderIndex: z.number().int().min(0),
  description: z.string().max(300, "300 caractères max").optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

const itemFormSchema = z.object({
  question: z.string().min(6, "Question requise"),
  orderIndex: z.number().int().min(0),
  answerHtml: z.string().min(1, "Réponse requise"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

type FaqFormValues = z.infer<typeof faqFormSchema>;
type ThemeFormValues = z.infer<typeof themeFormSchema>;
type ItemFormValues = z.infer<typeof itemFormSchema>;

type SearchItem = HelpFaqItem & {
  faqId: string;
  sourceKey: string;
  scopeType: HelpFaqScopeType;
  scopeLabel: string;
  schoolId: string | null;
  schoolName: string | null;
  themeTitle?: string;
};

type ViewFilter = "all" | "GLOBAL" | "SCHOOL";

type Props = {
  canManageOverride?: boolean;
};

type DecoratedTheme = HelpFaqTheme & {
  sourceKey: string;
  scopeType: HelpFaqScopeType;
  scopeLabel: string;
  schoolName: string | null;
};

export function AssistanceFaqPanel({ canManageOverride = true }: Props) {
  const [permissions, setPermissions] = useState({
    canManageGlobal: false,
    canManageSchool: false,
  });
  const [schoolScope, setSchoolScope] = useState<{
    schoolId: string;
    schoolName: string;
  } | null>(null);
  const [sources, setSources] = useState<HelpFaqSourceWithThemes[]>([]);
  const [adminFaqs, setAdminFaqs] = useState<HelpFaq[]>([]);
  const [editableFaqId, setEditableFaqId] = useState<string | null>(null);
  const [editableThemeId, setEditableThemeId] = useState<string | null>(null);
  const [editableItemId, setEditableItemId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ViewFilter>("all");
  const [activeThemeKey, setActiveThemeKey] = useState<string | null>(null);
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFaq, setSavingFaq] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const faqForm = useForm<FaqFormValues>({
    resolver: zodResolver(faqFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      audience: "PARENT",
      status: "DRAFT",
      description: "",
    },
  });

  const themeForm = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      orderIndex: 0,
      description: "",
      status: "DRAFT",
    },
  });

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    mode: "onChange",
    defaultValues: {
      question: "",
      orderIndex: 0,
      answerHtml: "",
      status: "DRAFT",
    },
  });

  const decoratedThemes = useMemo<DecoratedTheme[]>(() => {
    const visibleSources = sources.filter((source) => {
      if (selectedFilter === "all") return true;
      return source.scopeType === selectedFilter;
    });

    return visibleSources.flatMap((source) =>
      source.themes.map((theme) => ({
        ...theme,
        sourceKey: source.key,
        scopeType: source.scopeType,
        scopeLabel: source.scopeLabel,
        schoolName: source.schoolName,
      })),
    );
  }, [selectedFilter, sources]);

  const activeTheme = useMemo(
    () =>
      decoratedThemes.find(
        (theme) => `${theme.sourceKey}:${theme.id}` === activeThemeKey,
      ) ??
      decoratedThemes[0] ??
      null,
    [activeThemeKey, decoratedThemes],
  );

  const editableSource = useMemo(
    () => sources.find((source) => source.faq.id === editableFaqId) ?? null,
    [editableFaqId, sources],
  );

  const editableTheme = useMemo(
    () =>
      editableSource?.themes.find((theme) => theme.id === editableThemeId) ??
      null,
    [editableSource, editableThemeId],
  );

  const editableItem = useMemo(
    () =>
      editableTheme?.items.find((item) => item.id === editableItemId) ?? null,
    [editableItemId, editableTheme],
  );
  const adminMode = permissions.canManageGlobal
    ? "GLOBAL"
    : permissions.canManageSchool
      ? "SCHOOL"
      : null;

  async function loadFaqData() {
    setLoading(true);
    setError(null);
    try {
      const current = await helpFaqsApi.getCurrent();
      const themesResponse = await helpFaqsApi.getThemes();
      const nextPermissions = {
        canManageGlobal:
          current.permissions.canManageGlobal && canManageOverride,
        canManageSchool:
          current.permissions.canManageSchool && canManageOverride,
      };

      setPermissions(nextPermissions);
      setSchoolScope(current.schoolScope);
      setSources(themesResponse.sources);

      if (themesResponse.sources[0]?.themes[0]) {
        const first = themesResponse.sources[0].themes[0];
        setActiveThemeKey(`${themesResponse.sources[0].key}:${first.id}`);
        setExpandedItemIds(first.items[0] ? [first.items[0].id] : []);
      } else {
        setActiveThemeKey(null);
        setExpandedItemIds([]);
      }

      if (nextPermissions.canManageGlobal) {
        const admin = await helpFaqsApi.listGlobalAdmin();
        setAdminFaqs(admin.items);
        setEditableFaqId(
          (currentFaqId) => currentFaqId ?? admin.items[0]?.id ?? null,
        );
      } else if (nextPermissions.canManageSchool) {
        const admin = await helpFaqsApi.listSchoolAdmin();
        setAdminFaqs(admin.items);
        setEditableFaqId(
          (currentFaqId) => currentFaqId ?? admin.items[0]?.id ?? null,
        );
      } else {
        setAdminFaqs([]);
        setEditableFaqId(null);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger la FAQ",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFaqData();
  }, [canManageOverride]);

  useEffect(() => {
    if (!activeTheme && decoratedThemes[0]) {
      setActiveThemeKey(
        `${decoratedThemes[0].sourceKey}:${decoratedThemes[0].id}`,
      );
    }
  }, [activeTheme, decoratedThemes]);

  useEffect(() => {
    if (!editableSource) {
      faqForm.reset({
        title: "",
        audience: "PARENT",
        status: "DRAFT",
        description: "",
      });
      return;
    }

    faqForm.reset({
      title: editableSource.faq.title,
      audience: editableSource.faq.audience,
      status: editableSource.faq.status,
      description: editableSource.faq.description ?? "",
    });
  }, [editableSource, faqForm]);

  useEffect(() => {
    if (!editableTheme) {
      themeForm.reset({
        title: "",
        orderIndex: editableSource?.themes.length ?? 0,
        description: "",
        status: "DRAFT",
      });
      return;
    }

    themeForm.reset({
      title: editableTheme.title,
      orderIndex: editableTheme.orderIndex,
      description: editableTheme.description ?? "",
      status: editableTheme.status,
    });
  }, [editableSource, editableTheme, themeForm]);

  useEffect(() => {
    if (!editableItem) {
      itemForm.reset({
        question: "",
        orderIndex: editableTheme?.items.length ?? 0,
        answerHtml: "",
        status: "DRAFT",
      });
      return;
    }

    itemForm.reset({
      question: editableItem.question,
      orderIndex: editableItem.orderIndex,
      answerHtml: editableItem.answerHtml,
      status: editableItem.status,
    });
  }, [editableItem, editableTheme, itemForm]);

  async function runSearch() {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await helpFaqsApi.search(search.trim());
      setSearchResults(result.items);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Recherche impossible",
      );
    }
  }

  function toggleItem(itemId: string) {
    setExpandedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((entry) => entry !== itemId)
        : [...current, itemId],
    );
  }

  async function saveFaq(values: FaqFormValues) {
    setSavingFaq(true);
    setError(null);
    try {
      const saved = editableFaqId
        ? adminMode === "SCHOOL"
          ? await helpFaqsApi.updateSchoolFaq(editableFaqId, {
              title: values.title,
              audience: values.audience,
              status: values.status,
              description: values.description?.trim() || "",
            })
          : await helpFaqsApi.updateGlobalFaq(editableFaqId, {
              title: values.title,
              audience: values.audience,
              status: values.status,
              description: values.description?.trim() || "",
            })
        : adminMode === "SCHOOL"
          ? await helpFaqsApi.createSchoolFaq({
              title: values.title,
              audience: values.audience,
              status: values.status,
              description: values.description?.trim() || "",
            })
          : await helpFaqsApi.createGlobalFaq({
              title: values.title,
              audience: values.audience,
              status: values.status,
              description: values.description?.trim() || "",
            });

      setEditableFaqId(saved.id);
      await loadFaqData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Enregistrement impossible",
      );
    } finally {
      setSavingFaq(false);
    }
  }

  async function saveTheme(values: ThemeFormValues) {
    if (!editableFaqId) {
      setError("Aucune FAQ sélectionnée");
      return;
    }

    setSavingTheme(true);
    setError(null);
    try {
      const saved = editableTheme
        ? adminMode === "SCHOOL"
          ? await helpFaqsApi.updateSchoolTheme(editableTheme.id, {
              title: values.title,
              orderIndex: values.orderIndex,
              description: values.description?.trim() || "",
              status: values.status,
            })
          : await helpFaqsApi.updateGlobalTheme(editableTheme.id, {
              title: values.title,
              orderIndex: values.orderIndex,
              description: values.description?.trim() || "",
              status: values.status,
            })
        : adminMode === "SCHOOL"
          ? await helpFaqsApi.createSchoolTheme(editableFaqId, {
              title: values.title,
              orderIndex: values.orderIndex,
              description: values.description?.trim() || "",
              status: values.status,
            })
          : await helpFaqsApi.createGlobalTheme(editableFaqId, {
              title: values.title,
              orderIndex: values.orderIndex,
              description: values.description?.trim() || "",
              status: values.status,
            });

      setEditableThemeId(saved.id);
      await loadFaqData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Enregistrement impossible",
      );
    } finally {
      setSavingTheme(false);
    }
  }

  async function saveItem(values: ItemFormValues) {
    if (!editableTheme) {
      setError("Aucun thème sélectionné");
      return;
    }

    setSavingItem(true);
    setError(null);
    try {
      const payload = {
        question: values.question,
        orderIndex: values.orderIndex,
        answerHtml: values.answerHtml,
        answerJson: { html: values.answerHtml },
        status: values.status,
      };
      const saved = editableItem
        ? adminMode === "SCHOOL"
          ? await helpFaqsApi.updateSchoolItem(editableItem.id, payload)
          : await helpFaqsApi.updateGlobalItem(editableItem.id, payload)
        : adminMode === "SCHOOL"
          ? await helpFaqsApi.createSchoolItem(editableTheme.id, payload)
          : await helpFaqsApi.createGlobalItem(editableTheme.id, payload);

      setEditableItemId(saved.id);
      await loadFaqData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Enregistrement impossible",
      );
    } finally {
      setSavingItem(false);
    }
  }

  async function deleteFaq() {
    if (!editableFaqId) return;
    if (adminMode === "SCHOOL") {
      await helpFaqsApi.deleteSchoolFaq(editableFaqId);
    } else {
      await helpFaqsApi.deleteGlobalFaq(editableFaqId);
    }
    setEditableFaqId(null);
    setEditableThemeId(null);
    setEditableItemId(null);
    await loadFaqData();
  }

  async function deleteTheme() {
    if (!editableThemeId) return;
    if (adminMode === "SCHOOL") {
      await helpFaqsApi.deleteSchoolTheme(editableThemeId);
    } else {
      await helpFaqsApi.deleteGlobalTheme(editableThemeId);
    }
    setEditableThemeId(null);
    setEditableItemId(null);
    await loadFaqData();
  }

  async function deleteItem() {
    if (!editableItemId) return;
    if (adminMode === "SCHOOL") {
      await helpFaqsApi.deleteSchoolItem(editableItemId);
    } else {
      await helpFaqsApi.deleteGlobalItem(editableItemId);
    }
    setEditableItemId(null);
    await loadFaqData();
  }

  if (loading) {
    return (
      <section className="rounded-[24px] border border-warm-border bg-surface p-6 shadow-card">
        <p className="text-sm text-text-secondary">Chargement de la FAQ…</p>
      </section>
    );
  }

  return (
    <section className="space-y-4" data-testid="assistance-faq-panel">
      <div className="overflow-hidden rounded-[24px] border border-warm-border bg-surface shadow-card">
        <div className="grid gap-5 bg-[linear-gradient(135deg,rgba(12,95,168,0.12),rgba(194,230,255,0.28))] p-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              <CircleHelp className="h-3.5 w-3.5" />
              FAQ multi-sources
            </div>
            <div>
              <h2 className="font-heading text-2xl font-semibold text-text-primary">
                Questions sur Scolive et votre école
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                L’utilisateur retrouve au même endroit les réponses liées à
                l’application et celles propres à son établissement.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedFilter === "all" ? "bg-primary text-white" : "border border-white/70 bg-white/80 text-text-secondary"}`}
                onClick={() => setSelectedFilter("all")}
              >
                Toutes
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedFilter === "GLOBAL" ? "bg-primary text-white" : "border border-white/70 bg-white/80 text-text-secondary"}`}
                onClick={() => setSelectedFilter("GLOBAL")}
              >
                Scolive
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedFilter === "SCHOOL" ? "bg-primary text-white" : "border border-white/70 bg-white/80 text-text-secondary"}`}
                onClick={() => setSelectedFilter("SCHOOL")}
              >
                École
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2 rounded-[18px] border border-white/70 bg-white/80 p-2">
              <div className="flex flex-1 items-center gap-2 rounded-[14px] bg-background px-3">
                <Search className="h-4 w-4 text-text-secondary" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher une question, une fonctionnalité ou un sujet école"
                  className="h-11 w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
                />
              </div>
              <button
                type="button"
                onClick={() => void runSearch()}
                className="rounded-[14px] bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Chercher
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sources.map((source) => (
                <div
                  key={source.key}
                  className="rounded-[18px] border border-white/70 bg-white/85 p-4"
                >
                  <div className="flex items-center gap-2 text-primary">
                    {source.scopeType === "SCHOOL" ? (
                      <School className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                      {source.scopeLabel}
                    </p>
                  </div>
                  <p className="mt-2 text-base font-semibold text-text-primary">
                    {source.faq.title}
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    {source.themes.length} thème(s)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[20px] border border-warm-border bg-warm-surface p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Layers3 className="h-4 w-4 text-primary" />
              Sources et thèmes
            </div>
            <div className="space-y-3">
              {sources
                .filter((source) => {
                  if (selectedFilter === "all") return true;
                  return source.scopeType === selectedFilter;
                })
                .map((source) => (
                  <div key={source.key} className="space-y-2">
                    <div className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {source.scopeType === "SCHOOL" ? (
                        <School className="h-3.5 w-3.5" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {source.scopeLabel}
                    </div>
                    {source.themes.map((theme) => {
                      const themeKey = `${source.key}:${theme.id}`;
                      const isActive =
                        themeKey ===
                        (activeTheme
                          ? `${activeTheme.sourceKey}:${activeTheme.id}`
                          : null);
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            setActiveThemeKey(themeKey);
                            setExpandedItemIds(
                              theme.items[0] ? [theme.items[0].id] : [],
                            );
                          }}
                          className={`w-full rounded-[16px] px-3 py-3 text-left transition ${
                            isActive
                              ? "bg-primary text-white shadow-[0_18px_36px_rgba(12,95,168,0.18)]"
                              : "border border-transparent bg-white text-text-primary hover:border-primary/20"
                          }`}
                        >
                          <p className="text-sm font-semibold">{theme.title}</p>
                          <p
                            className={`mt-1 text-xs ${isActive ? "text-white/80" : "text-text-secondary"}`}
                          >
                            {theme.items.length} question(s)
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ))}
            </div>
          </aside>

          <div className="rounded-[20px] border border-warm-border bg-background p-3 sm:p-4">
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-[18px] border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Résultats
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Les réponses sont regroupées par provenance pour distinguer
                    Scolive et l’école.
                  </p>
                </div>
                {searchResults
                  .filter((item) => {
                    if (selectedFilter === "all") return true;
                    return item.scopeType === selectedFilter;
                  })
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSearchResults([]);
                        setSelectedFilter(item.scopeType);
                        const theme = sources
                          .find((source) => source.key === item.sourceKey)
                          ?.themes.find((entry) => entry.id === item.themeId);
                        if (!theme) return;
                        setActiveThemeKey(`${item.sourceKey}:${theme.id}`);
                        setExpandedItemIds([item.id]);
                      }}
                      className="w-full rounded-[18px] border border-warm-border bg-surface p-4 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
                          {item.scopeLabel}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {item.themeTitle}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-text-primary">
                        {item.question}
                      </p>
                    </button>
                  ))}
              </div>
            ) : activeTheme ? (
              <div className="space-y-3">
                <div className="rounded-[20px] border border-primary/10 bg-primary/5 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-primary">
                    <BookOpenText className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                      {activeTheme.scopeLabel}
                    </p>
                    <span className="text-xs text-text-secondary">
                      {activeTheme.title}
                    </span>
                  </div>
                  {activeTheme.description ? (
                    <p className="mt-2 text-sm text-text-secondary">
                      {activeTheme.description}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {activeTheme.items.map((item) => {
                    const expanded = expandedItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className="overflow-hidden rounded-[18px] border border-warm-border bg-surface"
                      >
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        >
                          <span className="text-sm font-semibold text-text-primary">
                            {item.question}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-text-secondary transition ${expanded ? "rotate-180" : ""}`}
                          />
                        </button>
                        {expanded ? (
                          <div className="border-t border-warm-border bg-background px-4 py-4">
                            <div
                              className="prose prose-sm max-w-none text-text-primary"
                              dangerouslySetInnerHTML={{
                                __html: item.answerHtml,
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                Aucun thème disponible.
              </p>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {adminMode ? (
        <div className="space-y-4" data-testid="assistance-faq-admin-forms">
          <div className="rounded-[18px] border border-primary/10 bg-primary/5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                {adminMode === "GLOBAL" ? "Scope global" : "Scope école"}
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {adminMode === "GLOBAL"
                  ? "Administration FAQ Scolive"
                  : `Administration FAQ de ${schoolScope?.schoolName ?? "l'école"}`}
              </span>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              {adminMode === "GLOBAL"
                ? "Vous gérez la base de connaissances commune à toute la plateforme."
                : "Vous gérez uniquement la FAQ de votre établissement."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {adminFaqs.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setEditableFaqId(entry.id);
                  const source = sources.find(
                    (item) => item.faq.id === entry.id,
                  );
                  setEditableThemeId(source?.themes[0]?.id ?? null);
                  setEditableItemId(source?.themes[0]?.items[0]?.id ?? null);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  entry.id === editableFaqId
                    ? "bg-primary text-white"
                    : "border border-warm-border bg-surface text-text-secondary"
                }`}
              >
                {entry.schoolName ?? "Scolive"} · {entry.title}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setEditableFaqId(null);
                setEditableThemeId(null);
                setEditableItemId(null);
              }}
              className="rounded-full border border-warm-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" />
              Nouvelle FAQ
            </button>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <form
              className="space-y-3 rounded-[20px] border border-warm-border bg-surface p-4 shadow-card"
              onSubmit={faqForm.handleSubmit((values) => void saveFaq(values))}
            >
              <h3 className="text-base font-semibold text-text-primary">
                {adminMode === "GLOBAL" ? "FAQ Scolive" : "FAQ école"}
              </h3>
              <FormField label="Titre">
                <FormTextInput
                  {...faqForm.register("title")}
                  invalid={Boolean(faqForm.formState.errors.title)}
                />
              </FormField>
              <Controller
                control={faqForm.control}
                name="audience"
                render={({ field }) => (
                  <FormField label="Audience">
                    <FormSelect {...field}>
                      {AUDIENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </FormSelect>
                  </FormField>
                )}
              />
              <Controller
                control={faqForm.control}
                name="status"
                render={({ field }) => (
                  <FormField label="Statut">
                    <FormSelect {...field}>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </FormSelect>
                  </FormField>
                )}
              />
              <FormField label="Description">
                <FormTextarea rows={3} {...faqForm.register("description")} />
              </FormField>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!faqForm.formState.isValid || savingFaq}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {editableFaqId ? "Mettre à jour" : "Créer"}
                </button>
                {editableFaqId ? (
                  <button
                    type="button"
                    onClick={() => void deleteFaq()}
                    className="inline-flex items-center justify-center rounded-[14px] border border-red-200 px-3 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </form>

            <form
              className="space-y-3 rounded-[20px] border border-warm-border bg-surface p-4 shadow-card"
              onSubmit={themeForm.handleSubmit(
                (values) => void saveTheme(values),
              )}
            >
              <h3 className="text-base font-semibold text-text-primary">
                Thème
              </h3>
              <FormField label="Titre">
                <FormTextInput
                  {...themeForm.register("title")}
                  invalid={Boolean(themeForm.formState.errors.title)}
                />
              </FormField>
              <Controller
                control={themeForm.control}
                name="orderIndex"
                render={({ field }) => (
                  <FormField label="Ordre">
                    <FormTextInput
                      type="number"
                      value={String(field.value)}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                    />
                  </FormField>
                )}
              />
              <Controller
                control={themeForm.control}
                name="status"
                render={({ field }) => (
                  <FormField label="Statut">
                    <FormSelect {...field}>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </FormSelect>
                  </FormField>
                )}
              />
              <FormField label="Description">
                <FormTextarea rows={3} {...themeForm.register("description")} />
              </FormField>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!themeForm.formState.isValid || savingTheme}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {editableThemeId ? "Mettre à jour" : "Créer"}
                </button>
                {editableThemeId ? (
                  <button
                    type="button"
                    onClick={() => void deleteTheme()}
                    className="inline-flex items-center justify-center rounded-[14px] border border-red-200 px-3 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </form>

            <form
              className="space-y-3 rounded-[20px] border border-warm-border bg-surface p-4 shadow-card"
              onSubmit={itemForm.handleSubmit(
                (values) => void saveItem(values),
              )}
            >
              <h3 className="text-base font-semibold text-text-primary">
                Question / Réponse
              </h3>
              <FormField label="Question">
                <FormTextInput
                  {...itemForm.register("question")}
                  invalid={Boolean(itemForm.formState.errors.question)}
                />
              </FormField>
              <Controller
                control={itemForm.control}
                name="orderIndex"
                render={({ field }) => (
                  <FormField label="Ordre">
                    <FormTextInput
                      type="number"
                      value={String(field.value)}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                    />
                  </FormField>
                )}
              />
              <Controller
                control={itemForm.control}
                name="status"
                render={({ field }) => (
                  <FormField label="Statut">
                    <FormSelect {...field}>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </FormSelect>
                  </FormField>
                )}
              />
              <Controller
                control={itemForm.control}
                name="answerHtml"
                render={({ field, fieldState }) => (
                  <FormRichTextEditor
                    label="Réponse"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    invalid={Boolean(fieldState.error)}
                    allowInlineVideos={false}
                  />
                )}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!itemForm.formState.isValid || savingItem}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {editableItemId ? "Mettre à jour" : "Créer"}
                </button>
                {editableItemId ? (
                  <button
                    type="button"
                    onClick={() => void deleteItem()}
                    className="inline-flex items-center justify-center rounded-[14px] border border-red-200 px-3 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
