"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Bug } from "lucide-react";
import {
  AssistanceModuleTabs,
  type AssistanceModuleTabKey,
} from "../../../../../components/tickets/assistance-module-tabs";
import { AssistancePlaceholderPanels } from "../../../../../components/tickets/assistance-placeholder-panels";
import { TicketsTabPanel } from "../../../../../components/tickets/tickets-tab-panel";
import { TicketsList } from "../../../../../components/tickets/tickets-list";
import { TicketsDetail } from "../../../../../components/tickets/tickets-detail";
import { TicketsCompose } from "../../../../../components/tickets/tickets-compose";
import {
  getTicket,
  listTickets,
} from "../../../../../components/tickets/tickets-api";
import type {
  TicketDetail,
  TicketFolderKey,
  TicketListItem,
  TicketStatus,
} from "../../../../../components/tickets/types";
import { TICKET_FOLDERS } from "../../../../../components/tickets/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type MePayload = {
  role?: string;
  activeRole?: string | null;
  schoolName?: string;
  id?: string;
  platformRoles?: string[];
};

export default function SchoolTicketsPage() {
  const router = useRouter();
  const params = useParams<{ schoolSlug: string }>();
  const schoolSlug = params.schoolSlug;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isPlatformStaff, setIsPlatformStaff] = useState(false);
  const [isPlatformAny, setIsPlatformAny] = useState(false);
  const [isPlatformRoleActive, setIsPlatformRoleActive] = useState(false);
  const [activeModuleTab, setActiveModuleTab] =
    useState<AssistanceModuleTabKey>("bug");

  const [activeFolder, setActiveFolder] = useState<TicketFolderKey>("open");
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(
    null,
  );
  const [composing, setComposing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Folder → statuses mapping
  const folderStatuses: TicketStatus[] | undefined =
    activeFolder === "all"
      ? undefined
      : TICKET_FOLDERS.find((f) => f.key === activeFolder)?.statuses;

  const loadProfile = useCallback(async () => {
    if (!schoolSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
        credentials: "include",
      });
      if (!res.ok) {
        router.replace(`/schools/${schoolSlug}/login`);
        return;
      }
      const me = (await res.json()) as MePayload;
      setCurrentUserId(me.id ?? "");
      setSchoolName(me.schoolName ?? null);
      const platformRoles = me.platformRoles ?? [];
      const activeRole = me.activeRole ?? null;
      setIsPlatformStaff(
        platformRoles.some((r) =>
          ["SUPER_ADMIN", "ADMIN", "SUPPORT"].includes(r),
        ),
      );
      setIsPlatformAny(platformRoles.length > 0);
      setIsPlatformRoleActive(
        !!activeRole && platformRoles.some((role) => role === activeRole),
      );
    } catch {
      router.replace(`/schools/${schoolSlug}/login`);
    } finally {
      setLoading(false);
    }
  }, [schoolSlug, router]);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const statuses = folderStatuses;
      if (statuses && statuses.length > 0) {
        // Load each status in parallel and merge
        const results = await Promise.all(
          statuses.map((s) => listTickets({ status: s, limit: 50 })),
        );
        const merged = results.flatMap((r) => r.data);
        merged.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setTickets(merged);
      } else {
        const res = await listTickets({ limit: 50 });
        setTickets(res.data);
      }
    } catch {
      setError("Impossible de charger les tickets.");
    } finally {
      setTicketsLoading(false);
    }
  }, [folderStatuses]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!loading && activeModuleTab === "bug") void loadTickets();
  }, [loading, loadTickets, activeFolder, activeModuleTab]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedTicket(null);
      return;
    }
    void getTicket(selectedId)
      .then(setSelectedTicket)
      .catch(() => setSelectedTicket(null));
  }, [selectedId]);

  function handleSelectTicket(ticket: TicketListItem) {
    setComposing(false);
    setSelectedId(ticket.id);
  }

  function handleCompose() {
    setActiveModuleTab("bug");
    setSelectedId(null);
    setComposing(true);
  }

  async function handleRefreshTicket() {
    if (selectedId) {
      const t = await getTicket(selectedId).catch(() => null);
      setSelectedTicket(t);
    }
    await loadTickets();
  }

  function handleDeletedTicket() {
    setSelectedId(null);
    setSelectedTicket(null);
    void loadTickets();
  }

  function handleComposeSuccess() {
    setComposing(false);
    setSuccessMsg("Ticket envoyé. Nous vous répondrons rapidement.");
    void loadTickets();
    setTimeout(() => setSuccessMsg(null), 5000);
  }

  // Folder counts (approximate from ticket list)
  const folderCounts: Partial<Record<TicketFolderKey, number>> = {
    open: tickets.filter((t) => ["OPEN", "IN_PROGRESS"].includes(t.status))
      .length,
    answered: tickets.filter((t) => t.status === "ANSWERED").length,
    resolved: tickets.filter((t) => ["RESOLVED", "CLOSED"].includes(t.status))
      .length,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-background px-2 py-3 min-[360px]:px-3 sm:py-4 md:px-6 md:py-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Assistance</h1>
          {schoolName && (
            <p className="text-xs text-text-secondary">{schoolName}</p>
          )}
        </div>
        {activeModuleTab === "bug" ? (
          <button
            type="button"
            onClick={handleCompose}
            className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(12,95,168,0.18)] transition hover:bg-primary-dark"
            data-testid="new-ticket-btn"
          >
            <Bug className="h-4 w-4" />
            Nouveau ticket
          </button>
        ) : null}
      </div>

      <AssistanceModuleTabs
        activeTab={activeModuleTab}
        onSelectTab={(tab) => {
          setActiveModuleTab(tab);
          if (tab !== "bug") {
            setComposing(false);
            setSelectedId(null);
          }
        }}
      />

      {successMsg && (
        <div className="rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-[14px] border border-notification/30 bg-notification/5 px-4 py-3 text-sm text-notification">
          {error}
        </div>
      )}

      {activeModuleTab === "bug" ? (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[220px_300px_minmax(0,1fr)]">
          <TicketsTabPanel
            activeFolder={activeFolder}
            onSelectFolder={(f) => {
              setActiveFolder(f);
              setSelectedId(null);
              setComposing(false);
            }}
            counts={folderCounts}
            onCompose={handleCompose}
            showCompose
          />

          <div className="flex min-h-0 flex-col rounded-[20px] border border-warm-border bg-surface p-2 shadow-card">
            <TicketsList
              tickets={tickets}
              selectedId={selectedId}
              onSelect={handleSelectTicket}
              isLoading={ticketsLoading}
            />
          </div>

          <div className="min-h-0">
            {composing ? (
              <TicketsCompose
                schoolSlug={schoolSlug}
                onSuccess={handleComposeSuccess}
                onError={(msg) => setError(msg)}
                onCancel={() => setComposing(false)}
              />
            ) : selectedTicket ? (
              <TicketsDetail
                ticket={selectedTicket}
                currentUserId={currentUserId}
                isPlatformStaff={isPlatformStaff}
                isPlatformAny={isPlatformAny}
                onTicketUpdated={handleRefreshTicket}
                onTicketDeleted={handleDeletedTicket}
                onError={(msg) => setError(msg)}
              />
            ) : (
              <div
                className="flex h-full flex-col items-center justify-center gap-2 rounded-[20px] border border-warm-border bg-surface p-5 text-center text-sm text-text-secondary shadow-card"
                data-testid="no-selection"
              >
                <Bug className="h-8 w-8 opacity-25" />
                <p className="font-medium">
                  Sélectionnez un ticket ou créez-en un nouveau
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <AssistancePlaceholderPanels
          tab={activeModuleTab}
          schoolName={schoolName}
          canManageGuides={isPlatformRoleActive}
        />
      )}
    </div>
  );
}
