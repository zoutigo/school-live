"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Plus, RotateCcw, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmailInput } from "../../components/ui/email-input";
import {
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { BackButton, SubmitButton } from "../../components/ui/form-buttons";
import { ImageUploadField } from "../../components/ui/image-upload-field";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { PaginationControls } from "../../components/ui/pagination-controls";
import { PinInput } from "../../components/ui/pin-input";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";
import {
  CAMEROON_CITIES_BY_REGION,
  CAMEROON_COUNTRY,
  CAMEROON_REGIONS,
} from "../../data/cameroon-locations";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");
const SCHOOLS_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";
type Tab = "overview" | "list" | "create" | "details" | "help";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SchoolCycle = "PRIMARY" | "SECONDARY";
type SchoolLanguageSystem = "FRANCOPHONE" | "ANGLOPHONE" | "BILINGUAL";

type SchoolAcademicYear = {
  id: string;
  label: string;
  startsAt?: string | null;
  endsAt?: string | null;
};

type SchoolRow = {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  region: string | null;
  city: string | null;
  cycle: SchoolCycle | null;
  languageSystem: SchoolLanguageSystem | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  academicYear?: SchoolAcademicYear | null;
  usersCount: number;
  classesCount: number;
  studentsCount: number;
};

type SchoolRoleBreakdown = {
  staff: number;
  teachers: number;
  parents: number;
  students: number;
};

type SchoolTrack = {
  id: string;
  code: string;
  label: string;
};

type SchoolCurriculum = {
  id: string;
  name: string;
  academicLevelLabel: string | null;
  trackLabel: string | null;
};

type SchoolDetails = {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  region: string | null;
  city: string | null;
  cycle: SchoolCycle | null;
  languageSystem: SchoolLanguageSystem | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  academicYear?: SchoolAcademicYear | null;
  tracks: SchoolTrack[];
  curriculums: SchoolCurriculum[];
  stats: {
    usersCount: number;
    classesCount: number;
    studentsCount: number;
    teachersCount: number;
    gradesCount: number;
  };
  roleBreakdown?: SchoolRoleBreakdown;
  schoolAdmins: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    mustChangePassword: boolean;
    profileCompleted: boolean;
    activationRequired: boolean;
    canResendInvite: boolean;
  }>;
};

type AdminMode = "email" | "phone";

type SchoolCycleGroup = { schools: number; students: number; classes: number };

type SchoolsOverview = {
  totals: { schools: number; students: number; classes: number };
  byCycle: Record<"PRIMARY" | "SECONDARY" | "UNSET", SchoolCycleGroup>;
};

type SlugPreviewState = {
  loading: boolean;
  baseSlug: string | null;
  suggestedSlug: string | null;
  baseExists: boolean;
  error: string | null;
};

type EmailCheckState =
  | "idle"
  | "checking"
  | "exists"
  | "not_found"
  | "invalid"
  | "error";

const createSchoolSchema = z.object({
  name: z.string().trim().min(1, "Le nom de l ecole est obligatoire."),
  country: z
    .union([z.string().trim(), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null) {
        return undefined;
      }
      return value;
    }),
  region: z
    .union([z.string().trim(), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null) {
        return undefined;
      }
      return value;
    }),
  city: z
    .union([z.string().trim(), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null) {
        return undefined;
      }
      return value;
    }),
  cycle: z
    .union([z.enum(["PRIMARY", "SECONDARY"]), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : undefined)),
  languageSystem: z
    .union([
      z.enum(["FRANCOPHONE", "ANGLOPHONE", "BILINGUAL"]),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((value) => (value ? value : undefined)),
  schoolAdminEmail: z
    .union([
      z.string().trim().email("L'email du school admin est invalide."),
      z.literal(""),
      z.undefined(),
    ])
    .optional()
    .transform((value) => (value ? value : undefined)),
  schoolAdminPhone: z
    .union([z.string().trim(), z.literal(""), z.undefined()])
    .optional()
    .transform((value) => (value ? value : undefined)),
  schoolAdminPin: z
    .union([z.string().trim(), z.literal(""), z.undefined()])
    .optional()
    .transform((value) => (value ? value : undefined)),
  logoUrl: z
    .union([z.string().trim().url(), z.literal(""), z.undefined()])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      return value;
    }),
});

function validateAdminIdentity(
  mode: AdminMode,
  email: string,
  phone: string,
  pin: string,
): string | null {
  if (mode === "email") {
    return z.string().email().safeParse(email.trim()).success
      ? null
      : "L'email du school admin est invalide.";
  }
  if (!phone.trim()) {
    return "Le téléphone du school admin est obligatoire.";
  }
  if (!/^\d{6}$/.test(pin.trim())) {
    return "Le PIN doit contenir exactement 6 chiffres.";
  }
  return null;
}

const updateSchoolSchema = z.object({
  name: z.string().trim().min(1, "Le nom de l ecole est obligatoire."),
  country: z.string().trim().nullable().optional(),
  region: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  cycle: z
    .union([z.enum(["PRIMARY", "SECONDARY"]), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
  languageSystem: z
    .union([
      z.enum(["FRANCOPHONE", "ANGLOPHONE", "BILINGUAL"]),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((value) => (value ? value : null)),
  logoUrl: z
    .union([z.string().trim().url(), z.literal(""), z.null(), z.undefined()])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      return value;
    }),
});

function toFileUrl(fileUrl: string | null) {
  if (!fileUrl) {
    return null;
  }

  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }

  return `${API_ORIGIN}${fileUrl}`;
}

export default function SchoolsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("overview");
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [overview, setOverview] = useState<SchoolsOverview | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [slugPreview, setSlugPreview] = useState<SlugPreviewState>({
    loading: false,
    baseSlug: null,
    suggestedSlug: null,
    baseExists: false,
    error: null,
  });
  const [emailCheckState, setEmailCheckState] =
    useState<EmailCheckState>("idle");
  const [emailCheckName, setEmailCheckName] = useState<string | null>(null);
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolDetails | null>(
    null,
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deletingSchoolId, setDeletingSchoolId] = useState<string | null>(null);
  const [sendingInviteAdminId, setSendingInviteAdminId] = useState<
    string | null
  >(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addAdminEmail, setAddAdminEmail] = useState("");
  const [addAdminEmailCheckState, setAddAdminEmailCheckState] =
    useState<EmailCheckState>("idle");
  const [addAdminEmailCheckName, setAddAdminEmailCheckName] = useState<
    string | null
  >(null);
  const [submittingAddAdmin, setSubmittingAddAdmin] = useState(false);
  const [addAdminError, setAddAdminError] = useState<string | null>(null);
  const [addAdminSuccess, setAddAdminSuccess] = useState<string | null>(null);
  const [addAdminMode, setAddAdminMode] = useState<AdminMode>("email");
  const [addAdminPhone, setAddAdminPhone] = useState("");
  const [addAdminPin, setAddAdminPin] = useState("");
  const [founderAdminMode, setFounderAdminMode] = useState<AdminMode>("email");
  const [additionalAdmins, setAdditionalAdmins] = useState<
    Array<{ mode: AdminMode; email: string; phone: string; pin: string }>
  >([]);
  const [additionalAdminErrors, setAdditionalAdminErrors] = useState<
    Array<string | null>
  >([]);
  const [removeAdminTarget, setRemoveAdminTarget] = useState<{
    schoolId: string;
    adminId: string;
    label: string;
  } | null>(null);
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);
  const createSchoolForm = useForm<z.input<typeof createSchoolSchema>>({
    resolver: zodResolver(createSchoolSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      country: CAMEROON_COUNTRY.value,
      region: "",
      city: "",
      cycle: "",
      languageSystem: "",
      schoolAdminEmail: "",
      schoolAdminPhone: "",
      schoolAdminPin: "",
      logoUrl: "",
    },
  });
  const editSchoolForm = useForm<z.input<typeof updateSchoolSchema>>({
    resolver: zodResolver(updateSchoolSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      country: CAMEROON_COUNTRY.value,
      region: "",
      city: "",
      cycle: "",
      languageSystem: "",
      logoUrl: "",
    },
  });
  const createSchoolValues = createSchoolForm.watch();
  const editSchoolValues = editSchoolForm.watch();

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => {
      void loadSchools(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search, loading]);

  useEffect(() => {
    const value = (createSchoolValues.name ?? "").trim();
    if (!value) {
      setSlugPreview({
        loading: false,
        baseSlug: null,
        suggestedSlug: null,
        baseExists: false,
        error: null,
      });
      return;
    }

    const timeout = setTimeout(() => {
      void previewSlug(value);
    }, 350);

    return () => clearTimeout(timeout);
  }, [createSchoolValues.name]);

  useEffect(() => {
    const email = (createSchoolValues.schoolAdminEmail ?? "").trim();
    if (!email) {
      setEmailCheckState("idle");
      setEmailCheckName(null);
      return;
    }

    if (!z.string().email().safeParse(email).success) {
      setEmailCheckState("invalid");
      setEmailCheckName(null);
      return;
    }

    const timeout = setTimeout(() => {
      void checkAdminEmail(email);
    }, 350);

    return () => clearTimeout(timeout);
  }, [createSchoolValues.schoolAdminEmail]);

  useEffect(() => {
    if (tab !== "create") {
      return;
    }
    void createSchoolForm.trigger();
  }, [createSchoolForm, tab]);

  useEffect(() => {
    const email = addAdminEmail.trim();
    if (!email) {
      setAddAdminEmailCheckState("idle");
      setAddAdminEmailCheckName(null);
      return;
    }

    if (!z.string().email().safeParse(email).success) {
      setAddAdminEmailCheckState("invalid");
      setAddAdminEmailCheckName(null);
      return;
    }

    const timeout = setTimeout(() => {
      void checkAddAdminEmail(email);
    }, 350);

    return () => clearTimeout(timeout);
  }, [addAdminEmail]);

  async function bootstrap() {
    const meResponse = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!meResponse.ok) {
      router.replace("/");
      return;
    }

    const me = (await meResponse.json()) as MeResponse;

    if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
      router.replace(
        me.schoolSlug ? `/schools/${me.schoolSlug}/dashboard` : "/",
      );
      return;
    }

    await Promise.all([loadOverview(), loadSchools(1)]);
    setLoading(false);
  }

  async function loadOverview() {
    const response = await fetch(`${API_URL}/system/schools/overview`, {
      credentials: "include",
    });
    if (!response.ok) return;
    setOverview((await response.json()) as SchoolsOverview);
  }

  async function loadSchools(targetPage = page) {
    setListLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(SCHOOLS_PAGE_SIZE),
      });
      if (search.trim()) params.set("search", search.trim());

      const schoolsResponse = await fetch(
        `${API_URL}/system/schools?${params.toString()}`,
        { credentials: "include" },
      );

      if (!schoolsResponse.ok) {
        router.replace("/");
        return;
      }

      const body = (await schoolsResponse.json()) as {
        items: SchoolRow[];
        meta: { page: number; total: number; totalPages: number };
      };
      setSchools(body.items);
      setTotal(body.meta.total);
      setPage(body.meta.page);
    } finally {
      setListLoading(false);
    }
  }

  async function openSchoolDetails(schoolId: string) {
    setSubmitError(null);
    setLoadingDetails(true);
    try {
      const response = await fetch(`${API_URL}/system/schools/${schoolId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        setSubmitError(t("schools.error.loadDetails"));
        return;
      }

      setSelectedSchool((await response.json()) as SchoolDetails);
      setTab("details");
    } catch {
      setSubmitError(t("schools.error.network"));
    } finally {
      setLoadingDetails(false);
    }
  }

  async function checkAdminEmail(email: string) {
    setEmailCheckState("checking");
    try {
      const params = new URLSearchParams({ email });
      const response = await fetch(
        `${API_URL}/system/users/exists?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        setEmailCheckState("error");
        setEmailCheckName(null);
        return;
      }

      const payload = (await response.json()) as {
        exists: boolean;
        user?: {
          firstName: string;
          lastName: string;
          mustChangePassword: boolean;
        };
      };

      if (payload.exists && payload.user) {
        setEmailCheckState("exists");
        setEmailCheckName(`${payload.user.firstName} ${payload.user.lastName}`);
      } else {
        setEmailCheckState("not_found");
        setEmailCheckName(null);
      }
    } catch {
      setEmailCheckState("error");
      setEmailCheckName(null);
    }
  }

  async function checkAddAdminEmail(email: string) {
    setAddAdminEmailCheckState("checking");
    try {
      const params = new URLSearchParams({ email });
      const response = await fetch(
        `${API_URL}/system/users/exists?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        setAddAdminEmailCheckState("error");
        setAddAdminEmailCheckName(null);
        return;
      }

      const payload = (await response.json()) as {
        exists: boolean;
        user?: {
          firstName: string;
          lastName: string;
          mustChangePassword: boolean;
        };
      };

      if (payload.exists && payload.user) {
        setAddAdminEmailCheckState("exists");
        setAddAdminEmailCheckName(
          `${payload.user.firstName} ${payload.user.lastName}`,
        );
      } else {
        setAddAdminEmailCheckState("not_found");
        setAddAdminEmailCheckName(null);
      }
    } catch {
      setAddAdminEmailCheckState("error");
      setAddAdminEmailCheckName(null);
    }
  }

  async function onAddSchoolAdmin(schoolId: string) {
    const identityError = validateAdminIdentity(
      addAdminMode,
      addAdminEmail,
      addAdminPhone,
      addAdminPin,
    );
    if (identityError) {
      setAddAdminError(identityError);
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setAddAdminError(t("schools.error.csrf"));
      router.replace("/");
      return;
    }

    const body =
      addAdminMode === "email"
        ? { email: addAdminEmail.trim() }
        : { phone: addAdminPhone.trim(), pin: addAdminPin.trim() };

    setSubmittingAddAdmin(true);
    setAddAdminError(null);
    setAddAdminSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/system/schools/${schoolId}/admins`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("schools.form.addAdminFailed"));
        setAddAdminError(String(message));
        return;
      }

      const payload = (await response.json()) as {
        activationCode?: string | null;
      };
      setAddAdminSuccess(
        payload.activationCode
          ? `${t("schools.form.addAdminSuccess")} ${t(
              "schools.form.activationCodeBanner",
            )}: ${payload.activationCode}`
          : t("schools.form.addAdminSuccess"),
      );
      setAddAdminEmail("");
      setAddAdminEmailCheckState("idle");
      setAddAdminEmailCheckName(null);
      setAddAdminPhone("");
      setAddAdminPin("");
      if (selectedSchool?.id === schoolId) {
        await openSchoolDetails(schoolId);
      }
    } catch {
      setAddAdminError(t("schools.error.network"));
    } finally {
      setSubmittingAddAdmin(false);
    }
  }

  async function onRemoveSchoolAdmin() {
    if (!removeAdminTarget) return;
    const { schoolId, adminId } = removeAdminTarget;

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      router.replace("/");
      return;
    }

    setRemovingAdminId(adminId);
    try {
      const response = await fetch(
        `${API_URL}/system/schools/${schoolId}/admins/${adminId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRF-Token": csrfToken },
        },
      );
      if (response.ok) {
        setRemoveAdminTarget(null);
        if (selectedSchool?.id === schoolId) {
          await openSchoolDetails(schoolId);
        }
      }
    } finally {
      setRemovingAdminId(null);
    }
  }

  async function previewSlug(schoolName: string) {
    setSlugPreview((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const params = new URLSearchParams({ name: schoolName });
      const response = await fetch(
        `${API_URL}/system/schools/slug-preview?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        setSlugPreview({
          loading: false,
          baseSlug: null,
          suggestedSlug: null,
          baseExists: false,
          error: t("schools.slug.error"),
        });
        return;
      }

      const payload = (await response.json()) as {
        baseSlug: string;
        suggestedSlug: string;
        baseExists: boolean;
      };

      setSlugPreview({
        loading: false,
        baseSlug: payload.baseSlug,
        suggestedSlug: payload.suggestedSlug,
        baseExists: payload.baseExists,
        error: null,
      });
    } catch {
      setSlugPreview({
        loading: false,
        baseSlug: null,
        suggestedSlug: null,
        baseExists: false,
        error: t("schools.slug.error"),
      });
    }
  }

  async function onCreateSchool(values: z.input<typeof createSchoolSchema>) {
    setSubmitError(null);
    setSubmitSuccess(null);

    const founderError = validateAdminIdentity(
      founderAdminMode,
      values.schoolAdminEmail ?? "",
      values.schoolAdminPhone ?? "",
      values.schoolAdminPin ?? "",
    );
    if (founderError) {
      setSubmitError(founderError);
      return;
    }
    const additionalErrors = additionalAdmins.map((admin) =>
      validateAdminIdentity(admin.mode, admin.email, admin.phone, admin.pin),
    );
    if (additionalErrors.some((error) => error !== null)) {
      setAdditionalAdminErrors(additionalErrors);
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setSubmitError(t("schools.error.csrf"));
      router.replace("/");
      return;
    }

    const parsed = createSchoolSchema.parse(values);
    const founderPayload =
      founderAdminMode === "email"
        ? { schoolAdminEmail: parsed.schoolAdminEmail }
        : {
            schoolAdminPhone: parsed.schoolAdminPhone,
            schoolAdminPin: parsed.schoolAdminPin,
          };
    const body = {
      name: parsed.name,
      country: parsed.country,
      region: parsed.region,
      city: parsed.city,
      cycle: parsed.cycle,
      languageSystem: parsed.languageSystem,
      logoUrl: parsed.logoUrl,
      ...founderPayload,
    };

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/system/schools`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("schools.error.createFallback"));
        setSubmitError(String(message));
        return;
      }

      const payload = (await response.json()) as {
        school: { id: string };
        userExisted: boolean;
        setupCompleted: boolean;
        activationRequired?: boolean;
        activationCode?: string | null;
      };

      const activationCodes: string[] = [];
      if (payload.activationCode) activationCodes.push(payload.activationCode);

      let additionalFailures = 0;
      for (const admin of additionalAdmins) {
        const adminBody =
          admin.mode === "email"
            ? { email: admin.email.trim() }
            : { phone: admin.phone.trim(), pin: admin.pin.trim() };
        try {
          const addResponse = await fetch(
            `${API_URL}/system/schools/${payload.school.id}/admins`,
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken,
              },
              body: JSON.stringify(adminBody),
            },
          );
          if (!addResponse.ok) {
            additionalFailures += 1;
            continue;
          }
          const addPayload = (await addResponse.json()) as {
            activationCode?: string | null;
          };
          if (addPayload.activationCode) {
            activationCodes.push(addPayload.activationCode);
          }
        } catch {
          additionalFailures += 1;
        }
      }

      const messageParts = [
        payload.userExisted
          ? payload.setupCompleted
            ? t("schools.success.createExisting")
            : t("schools.success.createExistingPending")
          : t("schools.success.createNew"),
        ...activationCodes.map(
          (code) => `${t("schools.form.activationCodeBanner")}: ${code}`,
        ),
      ];
      if (additionalFailures > 0) {
        messageParts.push(t("schools.form.additionalAdminsFailed"));
      }
      setSubmitSuccess(messageParts.join(" "));

      createSchoolForm.reset({
        name: "",
        country: CAMEROON_COUNTRY.value,
        region: "",
        city: "",
        cycle: "",
        languageSystem: "",
        schoolAdminEmail: "",
        schoolAdminPhone: "",
        schoolAdminPin: "",
        logoUrl: "",
      });
      setFounderAdminMode("email");
      setAdditionalAdmins([]);
      setAdditionalAdminErrors([]);
      setSlugPreview({
        loading: false,
        baseSlug: null,
        suggestedSlug: null,
        baseExists: false,
        error: null,
      });
      setEmailCheckState("idle");
      setEmailCheckName(null);
      await Promise.all([loadOverview(), loadSchools(1)]);
      // Si un code d'activation doit etre transmis manuellement (admin cree
      // par telephone), on reste sur l'onglet creation le temps que
      // l'utilisateur le lise, au lieu de basculer immediatement vers la
      // liste et de le faire disparaitre.
      if (activationCodes.length === 0) {
        setTab("list");
      }
    } catch {
      setSubmitError(t("schools.error.network"));
    } finally {
      setSubmitting(false);
    }
  }

  function startEditSchool(school: SchoolRow) {
    setEditError(null);
    setEditingSchoolId(school.id);
    editSchoolForm.reset({
      name: school.name,
      country: CAMEROON_COUNTRY.value,
      region: school.region ?? "",
      city: school.city ?? "",
      cycle: school.cycle ?? "",
      languageSystem: school.languageSystem ?? "",
      logoUrl: school.logoUrl ?? "",
    });
    void editSchoolForm.trigger();
    setAddAdminEmail("");
    setAddAdminEmailCheckState("idle");
    setAddAdminEmailCheckName(null);
    setAddAdminMode("email");
    setAddAdminPhone("");
    setAddAdminPin("");
    setAddAdminError(null);
    setAddAdminSuccess(null);
  }

  async function onSaveSchool(
    schoolId: string,
    values: z.input<typeof updateSchoolSchema>,
  ) {
    setEditError(null);

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setEditError(t("schools.error.csrf"));
      router.replace("/");
      return;
    }

    setSavingEdit(true);
    try {
      const response = await fetch(`${API_URL}/system/schools/${schoolId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          name: values.name,
          country: values.country ?? null,
          region: values.region ?? null,
          city: values.city ?? null,
          cycle: values.cycle ?? null,
          languageSystem: values.languageSystem ?? null,
          logoUrl: values.logoUrl ?? null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("schools.error.editFallback"));
        setEditError(String(message));
        return;
      }

      setEditingSchoolId(null);
      await Promise.all([loadOverview(), loadSchools()]);
      if (selectedSchool?.id === schoolId) {
        await openSchoolDetails(schoolId);
      }
    } catch {
      setEditError(t("schools.error.network"));
    } finally {
      setSavingEdit(false);
    }
  }

  function requestDeleteSchool(school: SchoolRow) {
    setDeleteTarget({
      id: school.id,
      label: school.name,
    });
  }

  async function onDeleteSchool(schoolId: string) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setSubmitError(t("schools.error.csrf"));
      router.replace("/");
      return;
    }

    setDeletingSchoolId(schoolId);
    try {
      const response = await fetch(`${API_URL}/system/schools/${schoolId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("schools.error.deleteFallback"));
        setSubmitError(String(message));
        return;
      }

      if (selectedSchool?.id === schoolId) {
        setSelectedSchool(null);
        setTab("list");
      }
      if (editingSchoolId === schoolId) {
        setEditingSchoolId(null);
      }

      await Promise.all([loadOverview(), loadSchools()]);
    } catch {
      setSubmitError(t("schools.error.network"));
    } finally {
      setDeletingSchoolId(null);
      setDeleteTarget(null);
    }
  }

  async function onResendSchoolAdminInvite(adminUserId: string) {
    if (!selectedSchool) {
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setSubmitError(t("schools.error.csrf"));
      router.replace("/");
      return;
    }

    setSendingInviteAdminId(adminUserId);
    try {
      const response = await fetch(
        `${API_URL}/system/schools/${selectedSchool.id}/admins/${adminUserId}/resend-invite`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("schools.error.inviteFallback"));
        setSubmitError(String(message));
        return;
      }

      const payload = (await response.json()) as { email: string };
      setSubmitSuccess(
        t("schools.success.inviteSent").replace("{email}", payload.email),
      );
      await openSchoolDetails(selectedSchool.id);
    } catch {
      setSubmitError(t("schools.error.network"));
    } finally {
      setSendingInviteAdminId(null);
    }
  }

  const hasActiveSearch = search.trim().length > 0;
  const totalPages = Math.max(1, Math.ceil(total / SCHOOLS_PAGE_SIZE));

  const overviewTotals = overview?.totals ?? {
    schools: 0,
    students: 0,
    classes: 0,
  };
  const overviewByCycle = overview?.byCycle ?? {
    PRIMARY: { schools: 0, students: 0, classes: 0 },
    SECONDARY: { schools: 0, students: 0, classes: 0 },
    UNSET: { schools: 0, students: 0, classes: 0 },
  };

  return (
    <AppShell schoolName="Scolive Platform">
      <div className="grid gap-4">
        <Card title={t("schools.title")} subtitle={t("schools.subtitle")}>
          <div className="mb-4 flex items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("overview")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "overview"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("schools.tab.overview")}
            </button>
            <button
              type="button"
              onClick={() => setTab("list")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "list"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("schools.tab.list")}
            </button>
            {tab === "create" ? (
              <span className="rounded-t-card border border-border border-b-surface bg-surface px-4 py-2 text-sm font-heading font-semibold text-primary">
                {t("schools.tab.create")}
              </span>
            ) : null}
            {selectedSchool ? (
              <button
                type="button"
                onClick={() => setTab("details")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "details"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                {t("schools.tab.details")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setTab("help")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "help"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("schools.tab.help")}
            </button>

            {tab === "list" ? (
              <button
                type="button"
                data-testid="schools-search-toggle"
                onClick={() => setFiltersOpen((current) => !current)}
                className={`ml-auto flex items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition ${
                  filtersOpen
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-text-secondary hover:text-text-primary"
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                {t("schools.search.toggleLabel")}
              </button>
            ) : null}

            {tab === "overview" || tab === "list" ? (
              <button
                type="button"
                data-testid="schools-create-trigger"
                onClick={() => setTab("create")}
                className={`${tab === "list" ? "" : "ml-auto"} flex items-center gap-1.5 rounded-[12px] bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark`}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("schools.action.newSchool")}
              </button>
            ) : null}
          </div>

          {tab === "list" && filtersOpen ? (
            <div
              className="mb-4 grid gap-3 rounded-card border border-border bg-background p-4"
              data-testid="schools-filter-panel"
            >
              <FormTextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("schools.search.placeholder")}
                data-testid="schools-filter-search-input"
              />
              <button
                type="button"
                data-testid="schools-filter-reset"
                onClick={() => setSearch("")}
                disabled={!hasActiveSearch}
                className="flex items-center justify-center gap-2 rounded-card border border-primary px-3 py-2 text-sm font-semibold text-primary transition disabled:cursor-not-allowed disabled:border-border disabled:text-text-secondary"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("schools.search.reset")}
              </button>
            </div>
          ) : null}

          {tab === "overview" ? (
            <div className="grid gap-4">
              {loading ? (
                <p className="text-sm text-text-secondary">
                  {t("schools.table.loading")}
                </p>
              ) : overviewTotals.schools === 0 ? (
                <p className="text-sm text-text-secondary">
                  {t("schools.overview.empty")}
                </p>
              ) : (
                <>
                  <div>
                    <p className="mb-2 text-sm font-heading font-semibold text-text-primary">
                      {t("schools.overview.title")}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <StatBox
                        label={t("schools.overview.totalSchools")}
                        value={overviewTotals.schools}
                      />
                      <StatBox
                        label={t("schools.overview.totalStudents")}
                        value={overviewTotals.students}
                      />
                      <StatBox
                        label={t("schools.overview.totalClasses")}
                        value={overviewTotals.classes}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-heading font-semibold text-text-primary">
                      {t("schools.overview.byCycleTitle")}
                    </p>
                    <div className="grid gap-3">
                      {(["PRIMARY", "SECONDARY", "UNSET"] as const).map(
                        (cycleKey) => {
                          const group = overviewByCycle[cycleKey];
                          if (group.schools === 0) {
                            return null;
                          }
                          return (
                            <div
                              key={cycleKey}
                              data-testid={`schools-overview-cycle-${cycleKey}`}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-background p-3"
                            >
                              <CyclePill cycle={cycleKey} t={t} />
                              <p className="text-sm font-semibold text-text-primary">
                                {group.schools}{" "}
                                {t("schools.overview.schoolsLabel")}
                              </p>
                              <p className="text-xs text-text-secondary">
                                {group.students}{" "}
                                {t("schools.overview.studentsLabel")} ·{" "}
                                {group.classes}{" "}
                                {t("schools.overview.classesLabel")}
                              </p>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {tab === "list" ? (
            <div>
              {loading || listLoading ? (
                <p className="text-sm text-text-secondary">
                  {t("schools.table.loading")}
                </p>
              ) : null}

              {!loading && !listLoading && schools.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {hasActiveSearch
                    ? t("schools.search.empty")
                    : t("schools.table.empty")}
                </p>
              ) : null}

              {!loading && !listLoading && schools.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {schools.map((school) => (
                    <div
                      key={school.id}
                      data-testid={`school-card-${school.id}`}
                      className="flex flex-col gap-0 overflow-hidden rounded-card border border-border bg-surface"
                    >
                      <div className="flex items-center gap-3 bg-primary px-4 py-3">
                        {school.logoUrl ? (
                          <img
                            src={toFileUrl(school.logoUrl) ?? ""}
                            alt={school.name}
                            className="h-9 w-9 rounded-card border border-white/30 object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate font-heading font-semibold text-white">
                            {school.name}
                          </p>
                          <p className="truncate text-xs text-white/75">
                            {school.slug}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 p-4">
                        <div className="flex flex-wrap gap-2">
                          <CyclePill cycle={school.cycle} t={t} />
                          <LanguagePill
                            languageSystem={school.languageSystem}
                            t={t}
                          />
                        </div>
                        <p className="text-sm text-text-primary">
                          {[school.city, school.region, school.country]
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {t("schools.table.academicYear")}:{" "}
                          {school.academicYear?.label ??
                            t("schools.table.noAcademicYear")}
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs text-text-secondary">
                          <div>
                            <p className="font-heading text-base font-semibold text-primary">
                              {school.usersCount}
                            </p>
                            {t("schools.table.users")}
                          </div>
                          <div>
                            <p className="font-heading text-base font-semibold text-primary">
                              {school.classesCount}
                            </p>
                            {t("schools.table.classes")}
                          </div>
                          <div>
                            <p className="font-heading text-base font-semibold text-primary">
                              {school.studentsCount}
                            </p>
                            {t("schools.table.students")}
                          </div>
                        </div>
                        <p className="text-xs text-text-secondary">
                          {t("schools.table.createdAt")}:{" "}
                          {new Date(school.createdAt).toLocaleDateString(
                            "fr-FR",
                          )}
                        </p>

                        {editingSchoolId === school.id ? (
                          <div className="grid gap-3 border-t border-border pt-3">
                            <div className="grid gap-3 md:grid-cols-2">
                              <FormField
                                label={t("schools.form.fieldName")}
                                error={
                                  editSchoolForm.formState.errors.name?.message
                                }
                              >
                                <FormTextInput
                                  aria-label={t("schools.form.fieldName")}
                                  value={editSchoolValues.name ?? ""}
                                  onChange={(event) => {
                                    editSchoolForm.setValue(
                                      "name",
                                      event.target.value,
                                      {
                                        shouldDirty: true,
                                        shouldTouch: true,
                                        shouldValidate: true,
                                      },
                                    );
                                  }}
                                  invalid={
                                    Boolean(
                                      editSchoolForm.formState.errors.name,
                                    ) ||
                                    !String(editSchoolValues.name ?? "").trim()
                                  }
                                />
                              </FormField>
                              <FormField label={t("schools.form.fieldCountry")}>
                                <select
                                  aria-label={t("schools.form.fieldCountry")}
                                  className="w-full rounded-card border border-border bg-warm-surface px-3 py-2 text-sm text-text-secondary"
                                  value={CAMEROON_COUNTRY.value}
                                  disabled
                                >
                                  <option value={CAMEROON_COUNTRY.value}>
                                    {CAMEROON_COUNTRY.label}
                                  </option>
                                </select>
                              </FormField>
                              <FormField label={t("schools.form.fieldRegion")}>
                                <select
                                  aria-label={t("schools.form.fieldRegion")}
                                  className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                  value={editSchoolValues.region ?? ""}
                                  onChange={(event) => {
                                    editSchoolForm.setValue(
                                      "region",
                                      event.target.value,
                                      {
                                        shouldDirty: true,
                                        shouldTouch: true,
                                        shouldValidate: true,
                                      },
                                    );
                                    editSchoolForm.setValue("city", "", {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    });
                                  }}
                                >
                                  <option value="">
                                    {t("schools.form.regionPlaceholder")}
                                  </option>
                                  {CAMEROON_REGIONS.map((region) => (
                                    <option
                                      key={region.value}
                                      value={region.value}
                                    >
                                      {region.label}
                                    </option>
                                  ))}
                                </select>
                              </FormField>
                              <FormField label={t("schools.form.fieldCity")}>
                                <select
                                  aria-label={t("schools.form.fieldCity")}
                                  className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-warm-surface disabled:text-text-secondary"
                                  value={editSchoolValues.city ?? ""}
                                  disabled={!editSchoolValues.region}
                                  onChange={(event) => {
                                    editSchoolForm.setValue(
                                      "city",
                                      event.target.value,
                                      {
                                        shouldDirty: true,
                                        shouldTouch: true,
                                        shouldValidate: true,
                                      },
                                    );
                                  }}
                                >
                                  <option value="">
                                    {editSchoolValues.region
                                      ? t("schools.form.cityPlaceholder")
                                      : t(
                                          "schools.form.cityPlaceholderNoRegion",
                                        )}
                                  </option>
                                  {(
                                    CAMEROON_CITIES_BY_REGION[
                                      editSchoolValues.region ?? ""
                                    ] ?? []
                                  ).map((city) => (
                                    <option key={city.value} value={city.value}>
                                      {city.label}
                                    </option>
                                  ))}
                                </select>
                              </FormField>
                              <FormField
                                label={t("schools.form.fieldCycleOpt")}
                              >
                                <select
                                  aria-label={t("schools.form.fieldCycleOpt")}
                                  className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                  value={editSchoolValues.cycle ?? ""}
                                  onChange={(event) => {
                                    editSchoolForm.setValue(
                                      "cycle",
                                      event.target.value as
                                        | ""
                                        | "PRIMARY"
                                        | "SECONDARY",
                                      {
                                        shouldDirty: true,
                                        shouldTouch: true,
                                        shouldValidate: true,
                                      },
                                    );
                                  }}
                                >
                                  <option value="">
                                    {t("schools.form.cyclePlaceholder")}
                                  </option>
                                  <option value="PRIMARY">
                                    {t("schools.form.cyclePrimary")}
                                  </option>
                                  <option value="SECONDARY">
                                    {t("schools.form.cycleSecondary")}
                                  </option>
                                </select>
                              </FormField>
                              <FormField
                                label={t("schools.form.fieldLanguageSystemOpt")}
                              >
                                <select
                                  aria-label={t(
                                    "schools.form.fieldLanguageSystemOpt",
                                  )}
                                  className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                  value={editSchoolValues.languageSystem ?? ""}
                                  onChange={(event) => {
                                    editSchoolForm.setValue(
                                      "languageSystem",
                                      event.target.value as
                                        | ""
                                        | "FRANCOPHONE"
                                        | "ANGLOPHONE"
                                        | "BILINGUAL",
                                      {
                                        shouldDirty: true,
                                        shouldTouch: true,
                                        shouldValidate: true,
                                      },
                                    );
                                  }}
                                >
                                  <option value="">
                                    {t(
                                      "schools.form.languageSystemPlaceholder",
                                    )}
                                  </option>
                                  <option value="FRANCOPHONE">
                                    {t(
                                      "schools.form.languageSystemFrancophone",
                                    )}
                                  </option>
                                  <option value="ANGLOPHONE">
                                    {t("schools.form.languageSystemAnglophone")}
                                  </option>
                                  <option value="BILINGUAL">
                                    {t("schools.form.languageSystemBilingual")}
                                  </option>
                                </select>
                              </FormField>

                              <ImageUploadField
                                kind="school-logo"
                                label={t("schools.form.fieldLogo")}
                                helperText={t("schools.form.logoHelper")}
                                value={editSchoolValues.logoUrl ?? null}
                                onChange={(value) => {
                                  editSchoolForm.setValue(
                                    "logoUrl",
                                    value ?? "",
                                    {
                                      shouldDirty: true,
                                      shouldTouch: true,
                                      shouldValidate: true,
                                    },
                                  );
                                }}
                              />
                            </div>
                            {editError ? (
                              <p className="mt-2 text-sm text-notification">
                                {editError}
                              </p>
                            ) : null}
                            <FormSubmitHint
                              visible={!editSchoolForm.formState.isValid}
                              className="mt-2"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                disabled={
                                  savingEdit ||
                                  !editSchoolForm.formState.isValid
                                }
                                onClick={() => {
                                  void editSchoolForm.handleSubmit((values) =>
                                    onSaveSchool(school.id, values),
                                  )();
                                }}
                              >
                                {savingEdit
                                  ? t("schools.action.saving")
                                  : t("schools.action.save")}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  setEditingSchoolId(null);
                                  setEditError(null);
                                  editSchoolForm.reset();
                                }}
                              >
                                {t("schools.action.cancel")}
                              </Button>
                            </div>

                            <div className="grid gap-2 border-t border-border pt-3">
                              <p className="text-sm font-medium text-text-primary">
                                {t("schools.form.addAdminTitle")}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant={
                                    addAdminMode === "email"
                                      ? "primary"
                                      : "secondary"
                                  }
                                  onClick={() => setAddAdminMode("email")}
                                >
                                  {t("schools.form.adminModeEmail")}
                                </Button>
                                <Button
                                  type="button"
                                  variant={
                                    addAdminMode === "phone"
                                      ? "primary"
                                      : "secondary"
                                  }
                                  onClick={() => setAddAdminMode("phone")}
                                >
                                  {t("schools.form.adminModePhone")}
                                </Button>
                              </div>
                              {addAdminMode === "email" ? (
                                <FormField
                                  label={t("schools.form.addAdminEmailLabel")}
                                  hint={
                                    addAdminEmailCheckState === "checking"
                                      ? t("schools.email.checking")
                                      : addAdminEmailCheckState === "invalid"
                                        ? t("schools.email.invalid")
                                        : addAdminEmailCheckState === "exists"
                                          ? t("schools.email.exists").replace(
                                              "{name}",
                                              addAdminEmailCheckName ??
                                                "utilisateur",
                                            )
                                          : addAdminEmailCheckState ===
                                              "not_found"
                                            ? t("schools.email.notFound")
                                            : addAdminEmailCheckState ===
                                                "error"
                                              ? t("schools.email.error")
                                              : null
                                  }
                                >
                                  <EmailInput
                                    aria-label={t(
                                      "schools.form.addAdminEmailLabel",
                                    )}
                                    value={addAdminEmail}
                                    onChange={(event) =>
                                      setAddAdminEmail(event.target.value)
                                    }
                                  />
                                </FormField>
                              ) : (
                                <div className="grid gap-2 md:grid-cols-2">
                                  <FormField
                                    label={t("schools.form.fieldAdminPhone")}
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "schools.form.fieldAdminPhone",
                                      )}
                                      value={addAdminPhone}
                                      onChange={(event) =>
                                        setAddAdminPhone(
                                          event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 9),
                                        )
                                      }
                                    />
                                  </FormField>
                                  <FormField
                                    label={t("schools.form.fieldAdminPin")}
                                  >
                                    <PinInput
                                      aria-label={t(
                                        "schools.form.fieldAdminPin",
                                      )}
                                      value={addAdminPin}
                                      onChange={(event) =>
                                        setAddAdminPin(
                                          event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6),
                                        )
                                      }
                                    />
                                  </FormField>
                                </div>
                              )}
                              {addAdminError ? (
                                <p className="text-sm text-notification">
                                  {addAdminError}
                                </p>
                              ) : null}
                              {addAdminSuccess ? (
                                <p className="text-sm text-primary">
                                  {addAdminSuccess}
                                </p>
                              ) : null}
                              <div>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  disabled={submittingAddAdmin}
                                  onClick={() => {
                                    void onAddSchoolAdmin(school.id);
                                  }}
                                >
                                  {submittingAddAdmin
                                    ? t("schools.form.addAdminSubmitting")
                                    : t("schools.form.addAdminSubmit")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 border-t border-border pt-3">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                void openSchoolDetails(school.id);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {t("schools.action.view")}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => startEditSchool(school)}
                            >
                              {t("schools.action.edit")}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => requestDeleteSchool(school)}
                            >
                              {t("schools.action.delete")}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {!loading && schools.length > 0 ? (
                <div className="pt-4">
                  <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    totalItems={total}
                    disabled={listLoading}
                    onPageChange={(nextPage) => {
                      void loadSchools(nextPage);
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "details" ? (
            <div className="grid gap-4">
              {loadingDetails ? (
                <p className="text-sm text-text-secondary">
                  {t("schools.details.loading")}
                </p>
              ) : null}
              {!loadingDetails && selectedSchool ? (
                <>
                  <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                    <div className="rounded-card border border-border bg-background p-3">
                      {selectedSchool.logoUrl ? (
                        <img
                          src={toFileUrl(selectedSchool.logoUrl) ?? ""}
                          alt={selectedSchool.name}
                          className="h-36 w-full rounded-card border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-36 items-center justify-center rounded-card border border-border text-sm text-text-secondary">
                          {t("schools.details.noLogo")}
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <InfoLine
                        label={t("schools.details.labelName")}
                        value={selectedSchool.name}
                      />
                      <InfoLine
                        label={t("schools.details.labelSlug")}
                        value={selectedSchool.slug}
                      />
                      <InfoLine
                        label={t("schools.details.labelCountry")}
                        value={selectedSchool.country ?? "-"}
                      />
                      <InfoLine
                        label={t("schools.details.labelRegion")}
                        value={selectedSchool.region ?? "-"}
                      />
                      <InfoLine
                        label={t("schools.details.labelCity")}
                        value={selectedSchool.city ?? "-"}
                      />
                      <InfoLine
                        label={t("schools.details.labelCycle")}
                        value={
                          selectedSchool.cycle
                            ? t(
                                selectedSchool.cycle === "PRIMARY"
                                  ? "schools.form.cyclePrimary"
                                  : "schools.form.cycleSecondary",
                              )
                            : "-"
                        }
                      />
                      <InfoLine
                        label={t("schools.details.labelLanguageSystem")}
                        value={
                          selectedSchool.languageSystem
                            ? t(
                                {
                                  FRANCOPHONE:
                                    "schools.form.languageSystemFrancophone",
                                  ANGLOPHONE:
                                    "schools.form.languageSystemAnglophone",
                                  BILINGUAL:
                                    "schools.form.languageSystemBilingual",
                                }[selectedSchool.languageSystem],
                              )
                            : "-"
                        }
                      />
                      <InfoLine
                        label={t("schools.details.labelCreated")}
                        value={new Date(
                          selectedSchool.createdAt,
                        ).toLocaleString("fr-FR")}
                      />
                      <InfoLine
                        label={t("schools.details.labelUpdated")}
                        value={new Date(
                          selectedSchool.updatedAt,
                        ).toLocaleString("fr-FR")}
                      />
                    </div>
                  </div>

                  <div className="rounded-card border border-border bg-background p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary">
                        {t("schools.details.schoolSystemTitle")}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          router.push(
                            `/curriculums?schoolSlug=${selectedSchool.slug}`,
                          )
                        }
                      >
                        {t("schools.details.schoolSystemViewFull")}
                      </Button>
                    </div>
                    {selectedSchool.tracks.length === 0 &&
                    selectedSchool.curriculums.length === 0 ? (
                      <p className="text-sm text-text-secondary">
                        {t("schools.details.schoolSystemEmpty")}
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase text-text-secondary">
                            {t("schools.details.schoolSystemTracksTitle")}
                          </p>
                          {selectedSchool.tracks.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedSchool.tracks.map((track) => (
                                <span
                                  key={track.id}
                                  className="rounded-full border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                                >
                                  {track.label}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-text-secondary">
                              {t("schools.details.schoolSystemNoTracks")}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase text-text-secondary">
                            {t("schools.details.schoolSystemCurriculumsTitle")}
                          </p>
                          {selectedSchool.curriculums.length > 0 ? (
                            <ul className="grid gap-1">
                              {selectedSchool.curriculums.map((curriculum) => (
                                <li
                                  key={curriculum.id}
                                  className="text-sm text-text-primary"
                                >
                                  {curriculum.name}
                                  {curriculum.academicLevelLabel ||
                                  curriculum.trackLabel
                                    ? ` (${[
                                        curriculum.academicLevelLabel,
                                        curriculum.trackLabel,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")})`
                                    : ""}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-text-secondary">
                              {t("schools.details.schoolSystemNoCurriculums")}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium text-text-primary">
                      {t("schools.details.usersCurrentYearTitle")}
                    </p>
                    <div
                      className="grid gap-3 sm:grid-cols-4"
                      data-testid="schools-details-role-breakdown"
                    >
                      <StatBox
                        label={t("schools.details.roleStaff")}
                        value={selectedSchool.roleBreakdown?.staff ?? 0}
                      />
                      <StatBox
                        label={t("schools.details.roleTeachers")}
                        value={selectedSchool.roleBreakdown?.teachers ?? 0}
                      />
                      <StatBox
                        label={t("schools.details.roleParents")}
                        value={selectedSchool.roleBreakdown?.parents ?? 0}
                      />
                      <StatBox
                        label={t("schools.details.roleStudents")}
                        value={selectedSchool.roleBreakdown?.students ?? 0}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-5">
                    <StatBox
                      label={t("schools.details.statUsers")}
                      value={selectedSchool.stats.usersCount}
                    />
                    <StatBox
                      label={t("schools.details.statClasses")}
                      value={selectedSchool.stats.classesCount}
                    />
                    <StatBox
                      label={t("schools.details.statStudents")}
                      value={selectedSchool.stats.studentsCount}
                    />
                    <StatBox
                      label={t("schools.details.statTeachers")}
                      value={selectedSchool.stats.teachersCount}
                    />
                    <StatBox
                      label={t("schools.details.statGrades")}
                      value={selectedSchool.stats.gradesCount}
                    />
                  </div>

                  <div className="rounded-card border border-border bg-background p-3">
                    <p className="mb-2 text-sm font-medium text-text-primary">
                      {t("schools.details.adminsTitle")}
                    </p>
                    {selectedSchool.schoolAdmins.length === 0 ? (
                      <p className="text-sm text-text-secondary">
                        {t("schools.details.adminsEmpty")}
                      </p>
                    ) : (
                      <ul className="grid gap-1 text-sm text-text-primary">
                        {selectedSchool.schoolAdmins.map((admin) => (
                          <li
                            key={admin.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface px-3 py-2"
                          >
                            <span>
                              {admin.firstName} {admin.lastName} -{" "}
                              {admin.phone ? admin.phone : admin.email}
                              {admin.activationRequired
                                ? ` (${t("schools.details.pendingActivation")})`
                                : ""}
                            </span>
                            <div className="flex items-center gap-2">
                              {admin.canResendInvite ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  disabled={sendingInviteAdminId === admin.id}
                                  onClick={() => {
                                    void onResendSchoolAdminInvite(admin.id);
                                  }}
                                >
                                  {sendingInviteAdminId === admin.id
                                    ? t("schools.details.inviteSending")
                                    : t("schools.details.inviteResend")}
                                </Button>
                              ) : !admin.activationRequired ? (
                                <span className="text-xs text-text-secondary">
                                  {t("schools.details.adminActive")}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                className="text-sm text-notification disabled:opacity-40"
                                disabled={
                                  selectedSchool.schoolAdmins.length <= 1
                                }
                                onClick={() =>
                                  setRemoveAdminTarget({
                                    schoolId: selectedSchool.id,
                                    adminId: admin.id,
                                    label: `${admin.firstName} ${admin.lastName}`,
                                  })
                                }
                              >
                                {t("schools.details.removeAdmin")}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {selectedSchool.schoolAdmins.length <= 1 &&
                    selectedSchool.schoolAdmins.length > 0 ? (
                      <p className="mt-2 text-xs text-text-secondary">
                        {t("schools.details.removeAdminLastAdminHint")}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <BackButton onClick={() => setTab("list")}>
                      {t("schools.details.backToList")}
                    </BackButton>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {tab === "create" ? (
            <div className="grid gap-3">
              <div>
                <BackButton onClick={() => setTab("list")}>
                  {t("schools.details.backToList")}
                </BackButton>
              </div>
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={createSchoolForm.handleSubmit(onCreateSchool)}
              >
                <FormField
                  label={t("schools.form.fieldName")}
                  className="md:col-span-2"
                  error={createSchoolForm.formState.errors.name?.message}
                  hint={
                    slugPreview.loading
                      ? t("schools.slug.loading")
                      : !slugPreview.loading && slugPreview.error
                        ? slugPreview.error
                        : !slugPreview.loading && slugPreview.suggestedSlug
                          ? slugPreview.baseExists
                            ? t("schools.slug.taken")
                                .replace(
                                  "{baseSlug}",
                                  slugPreview.baseSlug ?? "",
                                )
                                .replace(
                                  "{suggestedSlug}",
                                  slugPreview.suggestedSlug,
                                )
                            : t("schools.slug.available").replace(
                                "{suggestedSlug}",
                                slugPreview.suggestedSlug,
                              )
                          : null
                  }
                >
                  <FormTextInput
                    aria-label={t("schools.form.fieldName")}
                    value={createSchoolValues.name ?? ""}
                    onChange={(event) => {
                      createSchoolForm.setValue("name", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    invalid={
                      Boolean(createSchoolForm.formState.errors.name) ||
                      !String(createSchoolValues.name ?? "").trim()
                    }
                  />
                </FormField>

                <FormField label={t("schools.form.fieldCountryOpt")}>
                  <select
                    aria-label={t("schools.form.fieldCountry")}
                    className="w-full rounded-card border border-border bg-warm-surface px-3 py-2 text-sm text-text-secondary"
                    value={CAMEROON_COUNTRY.value}
                    disabled
                  >
                    <option value={CAMEROON_COUNTRY.value}>
                      {CAMEROON_COUNTRY.label}
                    </option>
                  </select>
                </FormField>

                <FormField label={t("schools.form.fieldRegionOpt")}>
                  <select
                    aria-label={t("schools.form.fieldRegion")}
                    className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    value={createSchoolValues.region ?? ""}
                    onChange={(event) => {
                      createSchoolForm.setValue("region", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                      createSchoolForm.setValue("city", "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                  >
                    <option value="">
                      {t("schools.form.regionPlaceholder")}
                    </option>
                    {CAMEROON_REGIONS.map((region) => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label={t("schools.form.fieldCityOpt")}
                  className="md:col-span-2"
                >
                  <select
                    aria-label={t("schools.form.fieldCity")}
                    className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-warm-surface disabled:text-text-secondary"
                    value={createSchoolValues.city ?? ""}
                    disabled={!createSchoolValues.region}
                    onChange={(event) => {
                      createSchoolForm.setValue("city", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                  >
                    <option value="">
                      {createSchoolValues.region
                        ? t("schools.form.cityPlaceholder")
                        : t("schools.form.cityPlaceholderNoRegion")}
                    </option>
                    {(
                      CAMEROON_CITIES_BY_REGION[
                        createSchoolValues.region ?? ""
                      ] ?? []
                    ).map((city) => (
                      <option key={city.value} value={city.value}>
                        {city.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label={t("schools.form.fieldCycleOpt")}>
                  <select
                    aria-label={t("schools.form.fieldCycleOpt")}
                    className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    value={createSchoolValues.cycle ?? ""}
                    onChange={(event) => {
                      createSchoolForm.setValue(
                        "cycle",
                        event.target.value as "" | "PRIMARY" | "SECONDARY",
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                  >
                    <option value="">
                      {t("schools.form.cyclePlaceholder")}
                    </option>
                    <option value="PRIMARY">
                      {t("schools.form.cyclePrimary")}
                    </option>
                    <option value="SECONDARY">
                      {t("schools.form.cycleSecondary")}
                    </option>
                  </select>
                </FormField>

                <FormField label={t("schools.form.fieldLanguageSystemOpt")}>
                  <select
                    aria-label={t("schools.form.fieldLanguageSystemOpt")}
                    className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    value={createSchoolValues.languageSystem ?? ""}
                    onChange={(event) => {
                      createSchoolForm.setValue(
                        "languageSystem",
                        event.target.value as
                          | ""
                          | "FRANCOPHONE"
                          | "ANGLOPHONE"
                          | "BILINGUAL",
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                  >
                    <option value="">
                      {t("schools.form.languageSystemPlaceholder")}
                    </option>
                    <option value="FRANCOPHONE">
                      {t("schools.form.languageSystemFrancophone")}
                    </option>
                    <option value="ANGLOPHONE">
                      {t("schools.form.languageSystemAnglophone")}
                    </option>
                    <option value="BILINGUAL">
                      {t("schools.form.languageSystemBilingual")}
                    </option>
                  </select>
                </FormField>

                <div className="grid gap-3 md:col-span-2">
                  <p className="text-sm font-medium text-text-primary">
                    {t("schools.form.mainAdminTitle")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={
                        founderAdminMode === "email" ? "primary" : "secondary"
                      }
                      onClick={() => setFounderAdminMode("email")}
                    >
                      {t("schools.form.adminModeEmail")}
                    </Button>
                    <Button
                      type="button"
                      variant={
                        founderAdminMode === "phone" ? "primary" : "secondary"
                      }
                      onClick={() => setFounderAdminMode("phone")}
                    >
                      {t("schools.form.adminModePhone")}
                    </Button>
                  </div>

                  {founderAdminMode === "email" ? (
                    <FormField
                      label={t("schools.form.fieldAdminEmail")}
                      error={
                        createSchoolForm.formState.errors.schoolAdminEmail
                          ?.message
                      }
                      hint={
                        emailCheckState === "checking"
                          ? t("schools.email.checking")
                          : emailCheckState === "invalid"
                            ? t("schools.email.invalid")
                            : emailCheckState === "exists"
                              ? t("schools.email.exists").replace(
                                  "{name}",
                                  emailCheckName ?? "utilisateur",
                                )
                              : emailCheckState === "not_found"
                                ? t("schools.email.notFound")
                                : emailCheckState === "error"
                                  ? t("schools.email.error")
                                  : null
                      }
                    >
                      <EmailInput
                        aria-label={t("schools.form.fieldAdminEmail")}
                        value={createSchoolValues.schoolAdminEmail ?? ""}
                        onChange={(event) => {
                          createSchoolForm.setValue(
                            "schoolAdminEmail",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                        invalid={Boolean(
                          createSchoolForm.formState.errors.schoolAdminEmail,
                        )}
                      />
                    </FormField>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label={t("schools.form.fieldAdminPhone")}>
                        <FormTextInput
                          aria-label={t("schools.form.fieldAdminPhone")}
                          value={createSchoolValues.schoolAdminPhone ?? ""}
                          onChange={(event) => {
                            createSchoolForm.setValue(
                              "schoolAdminPhone",
                              event.target.value.replace(/\D/g, "").slice(0, 9),
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            );
                          }}
                        />
                      </FormField>
                      <FormField label={t("schools.form.fieldAdminPin")}>
                        <PinInput
                          aria-label={t("schools.form.fieldAdminPin")}
                          value={createSchoolValues.schoolAdminPin ?? ""}
                          onChange={(event) => {
                            createSchoolForm.setValue(
                              "schoolAdminPin",
                              event.target.value.replace(/\D/g, "").slice(0, 6),
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            );
                          }}
                        />
                      </FormField>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 md:col-span-2">
                  <p className="text-sm font-medium text-text-primary">
                    {t("schools.form.additionalAdminsTitle")}
                  </p>
                  {additionalAdmins.map((admin, index) => (
                    <div
                      key={index}
                      className="grid gap-2 rounded-card border border-border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary">
                          {t("schools.form.additionalAdminTitle")} {index + 2}
                        </span>
                        <button
                          type="button"
                          className="text-sm text-notification"
                          onClick={() => {
                            setAdditionalAdmins((prev) =>
                              prev.filter((_, i) => i !== index),
                            );
                            setAdditionalAdminErrors((prev) =>
                              prev.filter((_, i) => i !== index),
                            );
                          }}
                        >
                          {t("schools.form.removeAdmin")}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={
                            admin.mode === "email" ? "primary" : "secondary"
                          }
                          onClick={() =>
                            setAdditionalAdmins((prev) =>
                              prev.map((entry, i) =>
                                i === index
                                  ? { ...entry, mode: "email" }
                                  : entry,
                              ),
                            )
                          }
                        >
                          {t("schools.form.adminModeEmail")}
                        </Button>
                        <Button
                          type="button"
                          variant={
                            admin.mode === "phone" ? "primary" : "secondary"
                          }
                          onClick={() =>
                            setAdditionalAdmins((prev) =>
                              prev.map((entry, i) =>
                                i === index
                                  ? { ...entry, mode: "phone" }
                                  : entry,
                              ),
                            )
                          }
                        >
                          {t("schools.form.adminModePhone")}
                        </Button>
                      </div>
                      {admin.mode === "email" ? (
                        <FormField label={t("schools.form.fieldAdminEmail")}>
                          <EmailInput
                            aria-label={t("schools.form.fieldAdminEmail")}
                            value={admin.email}
                            onChange={(event) =>
                              setAdditionalAdmins((prev) =>
                                prev.map((entry, i) =>
                                  i === index
                                    ? { ...entry, email: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                          />
                        </FormField>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-2">
                          <FormField label={t("schools.form.fieldAdminPhone")}>
                            <FormTextInput
                              aria-label={t("schools.form.fieldAdminPhone")}
                              value={admin.phone}
                              onChange={(event) =>
                                setAdditionalAdmins((prev) =>
                                  prev.map((entry, i) =>
                                    i === index
                                      ? {
                                          ...entry,
                                          phone: event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 9),
                                        }
                                      : entry,
                                  ),
                                )
                              }
                            />
                          </FormField>
                          <FormField label={t("schools.form.fieldAdminPin")}>
                            <PinInput
                              aria-label={t("schools.form.fieldAdminPin")}
                              value={admin.pin}
                              onChange={(event) =>
                                setAdditionalAdmins((prev) =>
                                  prev.map((entry, i) =>
                                    i === index
                                      ? {
                                          ...entry,
                                          pin: event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6),
                                        }
                                      : entry,
                                  ),
                                )
                              }
                            />
                          </FormField>
                        </div>
                      )}
                      {additionalAdminErrors[index] ? (
                        <p className="text-sm text-notification">
                          {additionalAdminErrors[index]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setAdditionalAdmins((prev) => [
                          ...prev,
                          { mode: "email", email: "", phone: "", pin: "" },
                        ])
                      }
                    >
                      {t("schools.form.addAdminButton")}
                    </Button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <ImageUploadField
                    kind="school-logo"
                    label={t("schools.form.fieldLogoCreate")}
                    helperText={t("schools.form.logoHelperFull")}
                    value={createSchoolValues.logoUrl || null}
                    onChange={(value) => {
                      createSchoolForm.setValue("logoUrl", value ?? "", {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                  />
                </div>

                <p className="text-xs text-text-secondary md:col-span-2">
                  {t("schools.form.emailNote")}
                </p>

                {submitError ? (
                  <p className="text-sm text-notification md:col-span-2">
                    {submitError}
                  </p>
                ) : null}
                {submitSuccess ? (
                  <p className="text-sm text-primary md:col-span-2">
                    {submitSuccess}
                  </p>
                ) : null}
                <div className="md:col-span-2">
                  <FormSubmitHint
                    visible={!createSchoolForm.formState.isValid}
                  />
                </div>

                <div className="md:col-span-2">
                  <SubmitButton
                    disabled={submitting || !createSchoolForm.formState.isValid}
                  >
                    {submitting
                      ? t("schools.action.creating")
                      : t("schools.action.create")}
                  </SubmitButton>
                </div>
              </form>
            </div>
          ) : null}

          {tab === "help" ? (
            <ModuleHelpTab
              moduleName="Ecoles"
              moduleSummary="ce module gere les etablissements: creation, informations de base, logo et administrateurs de reference."
              actions={[
                {
                  name: "Creer",
                  purpose:
                    "ouvrir un nouvel etablissement avec son identite et son school admin.",
                  howTo:
                    "remplir le formulaire de creation (nom, email admin, logo), puis valider.",
                  moduleImpact:
                    "l'ecole apparait dans la liste et devient selectionnable dans les autres ecrans admin.",
                  crossModuleImpact:
                    "les modules Utilisateurs, Classes et Inscriptions peuvent ensuite recevoir des donnees rattachees a cette ecole.",
                },
                {
                  name: "Modifier",
                  purpose:
                    "mettre a jour le nom/logo ou corriger des informations d'etablissement.",
                  howTo:
                    "ouvrir les actions d'une ligne puis enregistrer les changements.",
                  moduleImpact:
                    "la fiche detail et la liste sont mises a jour immediatement.",
                  crossModuleImpact:
                    "les libelles ecole affiches dans les modules dependants sont harmonises.",
                },
                {
                  name: "Supprimer",
                  purpose:
                    "retirer un etablissement non utilise ou cree par erreur.",
                  howTo:
                    "lancer l'action Supprimer puis confirmer l'operation irreversible.",
                  moduleImpact: "l'ecole disparait de ce module.",
                  crossModuleImpact:
                    "les comptes, classes et inscriptions relies deviennent orphelins ou invalides selon les regles backend; operation a reserver aux cas maitrises.",
                },
              ]}
              tips={[
                "Verifier l'email du school admin avant creation pour eviter les doublons d'acces.",
                "Traiter les suppressions uniquement apres audit des donnees rattachees.",
              ]}
            />
          ) : null}

          {tab !== "create" && submitError ? (
            <p className="mt-3 text-sm text-notification">{submitError}</p>
          ) : null}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("schools.delete.title")}
        message={
          deleteTarget
            ? t("schools.delete.message").replace("{name}", deleteTarget.label)
            : ""
        }
        confirmLabel={t("schools.delete.confirm")}
        loading={Boolean(deletingSchoolId)}
        onCancel={() => {
          if (!deletingSchoolId) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          if (deleteTarget) {
            void onDeleteSchool(deleteTarget.id);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(removeAdminTarget)}
        title={t("schools.details.confirmRemoveAdminTitle")}
        message={
          removeAdminTarget
            ? t("schools.details.confirmRemoveAdminMessage").replace(
                "{name}",
                removeAdminTarget.label,
              )
            : ""
        }
        confirmLabel={t("schools.details.confirmRemoveAdminConfirm")}
        loading={Boolean(removingAdminId)}
        onCancel={() => {
          if (!removingAdminId) {
            setRemoveAdminTarget(null);
          }
        }}
        onConfirm={() => {
          void onRemoveSchoolAdmin();
        }}
      />
    </AppShell>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-background px-3 py-2">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-border bg-background px-3 py-2">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-lg font-heading font-semibold text-primary">{value}</p>
    </div>
  );
}

function CyclePill({
  cycle,
  t,
}: {
  cycle: SchoolCycle | "UNSET" | null;
  t: TranslateFn;
}) {
  const label =
    cycle === "PRIMARY"
      ? t("schools.form.cyclePrimary")
      : cycle === "SECONDARY"
        ? t("schools.form.cycleSecondary")
        : t("schools.overview.cycleUnset");
  const tone =
    cycle === "PRIMARY"
      ? "border-teal-border bg-teal-surface text-accent-teal-dark"
      : cycle === "SECONDARY"
        ? "border-warm-border bg-warm-surface text-warm-accent-dark"
        : "border-border bg-background text-text-secondary";
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}

function LanguagePill({
  languageSystem,
  t,
}: {
  languageSystem: SchoolLanguageSystem | null;
  t: TranslateFn;
}) {
  if (!languageSystem) {
    return null;
  }
  const label = {
    FRANCOPHONE: t("schools.form.languageSystemFrancophone"),
    ANGLOPHONE: t("schools.form.languageSystemAnglophone"),
    BILINGUAL: t("schools.form.languageSystemBilingual"),
  }[languageSystem];
  return (
    <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary">
      {label}
    </span>
  );
}
