"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bug, Lightbulb, Search } from "lucide-react";
import {
  AssistanceModuleTabs,
  type AssistanceModuleTabKey,
} from "../../components/tickets/assistance-module-tabs";
import { AssistancePlaceholderPanels } from "../../components/tickets/assistance-placeholder-panels";
import { TicketsTabPanel } from "../../components/tickets/tickets-tab-panel";
import { TicketsList } from "../../components/tickets/tickets-list";
import { TicketsDetail } from "../../components/tickets/tickets-detail";
import { getTicket, listTickets } from "../../components/tickets/tickets-api";
import type {
  TicketDetail,
  TicketFolderKey,
  TicketListItem,
  TicketStatus,
  TicketType,
} from "../../components/tickets/types";
import { TICKET_FOLDERS } from "../../components/tickets/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type GlobalMe = {
  id?: string;
  activeRole?: string | null;
  platformRoles?: string[];
};

export default function AdminTicketsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isPlatformStaff, setIsPlatformStaff] = useState(false);
  const [isPlatformRoleActive, setIsPlatformRoleActive] = useState(false);
  const [activeModuleTab, setActiveModuleTab] =
    useState<AssistanceModuleTabKey>("bug");

  const [activeFolder, setActiveFolder] = useState<TicketFolderKey>("all");
  const [typeFilter, setTypeFilter] = useState<TicketType | "">("");
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(
    null,
  );

  const folderStatuses: TicketStatus[] | undefined =
    activeFolder === "all"
      ? undefined
      : TICKET_FOLDERS.find((f) => f.key === activeFolder)?.statuses;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/me`, { credentials: "include" });
      if (!res.ok) {
        router.replace("/");
        return;
      }
      const me = (await res.json()) as GlobalMe;
      const roles = me.platformRoles ?? [];
      if (roles.length === 0) {
        router.replace("/acceuil");
        return;
      }
      setCurrentUserId(me.id ?? "");
      setIsPlatformStaff(
        roles.some((r) => ["SUPER_ADMIN", "ADMIN", "SUPPORT"].includes(r)),
      );
      setIsPlatformRoleActive(
        !!me.activeRole && roles.some((role) => role === me.activeRole),
      );
    } catch {
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      if (folderStatuses && folderStatuses.length > 0) {
        const results = await Promise.all(
          folderStatuses.map((s) =>
            listTickets({
              status: s,
              type: typeFilter || undefined,
              q: search || undefined,
              limit: 100,
            }),
          ),
        );
        const merged = results.flatMap((r) => r.data);
        merged.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setTickets(merged);
        setTotal(merged.length);
      } else {
        const res = await listTickets({
          type: typeFilter || undefined,
          q: search || undefined,
          limit: 100,
        });
        setTickets(res.data);
        setTotal(res.meta.total);
      }
    } catch {
      setError("Impossible de charger les tickets.");
    } finally {
      setTicketsLoading(false);
    }
  }, [folderStatuses, typeFilter, search]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!loading && activeModuleTab === "bug") void loadTickets();
  }, [loading, loadTickets, activeFolder, typeFilter, search, activeModuleTab]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedTicket(null);
      return;
    }
    void getTicket(selectedId)
      .then(setSelectedTicket)
      .catch(() => setSelectedTicket(null));
  }, [selectedId]);

  async function handleRefreshTicket() {
    if (selectedId) {
      const t = await getTicket(selectedId).catch(() => null);
      setSelectedTicket(t);
    }
    await loadTickets();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-h-screen flex-col gap-4 bg-background px-2 py-3 min-[360px]:px-3 sm:py-4 md:px-6 md:py-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-text-primary">
          Tickets d&apos;assistance
        </h1>
        <span className="rounded-full border border-warm-border bg-warm-surface px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
          {total} au total
        </span>

        {activeModuleTab === "bug" ? (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === "BUG" ? "" : "BUG")}
              className={`flex items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition ${
                typeFilter === "BUG"
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-warm-border bg-warm-surface text-text-secondary hover:text-text-primary"
              }`}
              data-testid="filter-bug"
            >
              <Bug className="h-3.5 w-3.5" />
              Bugs
            </button>
            <button
              type="button"
              onClick={() =>
                setTypeFilter(
                  typeFilter === "FEATURE_REQUEST" ? "" : "FEATURE_REQUEST",
                )
              }
              className={`flex items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition ${
                typeFilter === "FEATURE_REQUEST"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-warm-border bg-warm-surface text-text-secondary hover:text-text-primary"
              }`}
              data-testid="filter-feature"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Suggestions
            </button>

            <div className="flex items-center gap-2 rounded-[12px] border border-warm-border bg-warm-surface px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-text-secondary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-40 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-secondary"
                data-testid="search-input"
              />
            </div>
          </div>
        ) : null}
      </div>

      <AssistanceModuleTabs
        activeTab={activeModuleTab}
        onSelectTab={setActiveModuleTab}
      />

      {error && (
        <div className="rounded-[14px] border border-notification/30 bg-notification/5 px-4 py-3 text-sm text-notification">
          {error}
        </div>
      )}

      {activeModuleTab === "bug" ? (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[200px_300px_minmax(0,1fr)]">
          <TicketsTabPanel
            activeFolder={activeFolder}
            onSelectFolder={(f) => {
              setActiveFolder(f);
              setSelectedId(null);
            }}
            showCompose={false}
          />

          <div className="flex min-h-0 flex-col rounded-[20px] border border-warm-border bg-surface p-2 shadow-card">
            <TicketsList
              tickets={tickets}
              selectedId={selectedId}
              onSelect={(t) => setSelectedId(t.id)}
              isLoading={ticketsLoading}
            />
          </div>

          <div className="min-h-0">
            {selectedTicket ? (
              <TicketsDetail
                ticket={selectedTicket}
                currentUserId={currentUserId}
                isPlatformStaff={isPlatformStaff}
                isPlatformAny
                onTicketUpdated={handleRefreshTicket}
                onTicketDeleted={() => {
                  setSelectedId(null);
                  void loadTickets();
                }}
                onError={(msg) => setError(msg)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-[20px] border border-warm-border bg-surface p-5 text-center text-sm text-text-secondary shadow-card">
                <Bug className="h-8 w-8 opacity-25" />
                <p className="font-medium">Sélectionnez un ticket</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <AssistancePlaceholderPanels
          tab={activeModuleTab}
          canManageGuides={isPlatformRoleActive}
        />
      )}
    </div>
  );
}
