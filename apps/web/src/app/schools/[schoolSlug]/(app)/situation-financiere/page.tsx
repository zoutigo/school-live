"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileText,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import { Card } from "../../../../../components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

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

type MeResponse = {
  role: Role;
  firstName: string;
  lastName: string;
};

type TabKey = "compte" | "porte-monnaie" | "factures" | "reglement";

type LedgerEntry = {
  id: string;
  date: string;
  label: string;
  debit: number;
  credit: number;
  status?: "a-venir" | "effectue";
};

type WalletEntry = {
  id: string;
  label: string;
  balance: number;
  cap: number;
  lastOperation: string;
};

type Invoice = {
  id: string;
  document: string;
  date: string;
  amount: number;
  status: "payee" | "en-attente" | "retard";
};

const ledgerEntries: LedgerEntry[] = [
  {
    id: "l-1",
    date: "15 janvier 2026",
    label: "Frais de scolarite - trimestre 2",
    debit: 185000,
    credit: 0,
    status: "effectue",
  },
  {
    id: "l-2",
    date: "20 janvier 2026",
    label: "Versement Orange Money",
    debit: 0,
    credit: 100000,
    status: "effectue",
  },
  {
    id: "l-3",
    date: "31 janvier 2026",
    label: "Cantine - forfait mensuel",
    debit: 35000,
    credit: 0,
    status: "effectue",
  },
  {
    id: "l-4",
    date: "10 fevrier 2026",
    label: "Versement MTN MoMo",
    debit: 0,
    credit: 80000,
    status: "effectue",
  },
  {
    id: "l-5",
    date: "02 mars 2026",
    label: "Prelevement a venir - activites",
    debit: 25000,
    credit: 0,
    status: "a-venir",
  },
];

const wallets: WalletEntry[] = [
  {
    id: "w-1",
    label: "Cantine",
    balance: 12500,
    cap: 30000,
    lastOperation: "Recharge Orange Money le 16 fevrier 2026",
  },
  {
    id: "w-2",
    label: "Transport",
    balance: 6000,
    cap: 25000,
    lastOperation: "Debit navette le 20 fevrier 2026",
  },
  {
    id: "w-3",
    label: "Activites",
    balance: 9000,
    cap: 20000,
    lastOperation: "Recharge cash au guichet le 12 fevrier 2026",
  },
];

const walletHistory = [
  {
    id: "wh-1",
    date: "20 fevrier 2026",
    label: "Debit navette semaine",
    amount: -3500,
    channel: "Porte-monnaie Transport",
  },
  {
    id: "wh-2",
    date: "16 fevrier 2026",
    label: "Recharge Orange Money",
    amount: 10000,
    channel: "Porte-monnaie Cantine",
  },
  {
    id: "wh-3",
    date: "12 fevrier 2026",
    label: "Recharge cash guichet",
    amount: 9000,
    channel: "Porte-monnaie Activites",
  },
];

const invoices: Invoice[] = [
  {
    id: "inv-2477",
    document: "Facture 2477 - Scolarite T2",
    date: "15 janvier 2026",
    amount: 185000,
    status: "payee",
  },
  {
    id: "inv-2518",
    document: "Facture 2518 - Cantine fevrier",
    date: "01 fevrier 2026",
    amount: 35000,
    status: "en-attente",
  },
  {
    id: "inv-2542",
    document: "Facture 2542 - Activites trimestrielles",
    date: "14 fevrier 2026",
    amount: 25000,
    status: "retard",
  },
];

const paymentChannels = [
  {
    name: "Orange Money",
    detail: "237 6 90 12 34 56",
    state: "Actif",
    badgeTone: "ok",
  },
  {
    name: "MTN Mobile Money",
    detail: "237 6 75 00 99 88",
    state: "Actif",
    badgeTone: "ok",
  },
  {
    name: "Reglement cash",
    detail: "Guichet comptable (07h30 - 15h30)",
    state: "Disponible",
    badgeTone: "neutral",
  },
] as const;

function formatXaf(amount: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}

function Badge({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "neutral";
  children: string;
}) {
  if (tone === "ok") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
        {children}
      </span>
    );
  }

  if (tone === "warn") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
        {children}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-background px-2 py-1 text-xs font-semibold text-text-secondary">
      {children}
    </span>
  );
}

export default function ParentFinancePage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("compte");
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    void loadProfile();
  }, [schoolSlug]);

  async function loadProfile() {
    setLoading(true);
    const response = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    const payload = (await response.json()) as MeResponse;
    if (payload.role !== "PARENT") {
      router.replace(`/schools/${schoolSlug}/dashboard`);
      return;
    }

    setMe(payload);
    setLoading(false);
  }

  const currentBalance = useMemo(
    () =>
      ledgerEntries.reduce((acc, entry) => acc + entry.credit - entry.debit, 0),
    [],
  );
  const pendingAmount = useMemo(
    () =>
      ledgerEntries
        .filter((entry) => entry.status === "a-venir")
        .reduce((acc, entry) => acc + entry.debit, 0),
    [],
  );
  const walletTotal = useMemo(
    () => wallets.reduce((acc, entry) => acc + entry.balance, 0),
    [],
  );

  return (
    <div className="grid gap-4">
      <Card
        title="Situation financiere"
        subtitle={
          me
            ? `${me.firstName} ${me.lastName} - suivi des reglements et soldes`
            : "Chargement du profil parent..."
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : (
          <div className="grid gap-4">
            <div className="rounded-card border border-primary/30 bg-gradient-to-br from-[#EAF4FF] via-[#F5FAFF] to-surface p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    Solde compte
                  </p>
                  <p className="mt-1 text-xl font-heading font-bold text-primary">
                    {formatXaf(currentBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    A venir
                  </p>
                  <p className="mt-1 text-xl font-heading font-bold text-amber-700">
                    {formatXaf(pendingAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    Porte-monnaie total
                  </p>
                  <p className="mt-1 text-xl font-heading font-bold text-primary">
                    {formatXaf(walletTotal)}
                  </p>
                </div>
              </div>
            </div>

            <div className="-mx-1 flex items-end gap-1 overflow-x-auto border-b border-border px-1 pb-1">
              {(
                [
                  { key: "compte", label: "Compte" },
                  { key: "porte-monnaie", label: "Porte-monnaie" },
                  { key: "factures", label: "Factures" },
                  { key: "reglement", label: "Mode de reglement" },
                ] as const
              ).map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setTab(entry.key)}
                  className={`shrink-0 rounded-t-card px-3 py-2 text-sm font-heading font-semibold ${
                    tab === entry.key
                      ? "border border-border border-b-surface bg-surface text-primary"
                      : "text-text-secondary"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            {tab === "compte" ? (
              <div className="grid gap-4">
                <div className="grid gap-2 md:hidden">
                  {ledgerEntries.map((entry) => (
                    <article
                      key={entry.id}
                      className="rounded-card border border-border bg-background p-3"
                    >
                      <p className="text-xs text-text-secondary">
                        {entry.date}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-primary">
                        {entry.label}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-sm text-text-secondary">
                          Debit: {formatXaf(entry.debit)}
                        </p>
                        <p className="text-sm text-primary">
                          Credit: {formatXaf(entry.credit)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto rounded-card border border-border md:block">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-background text-left text-text-secondary">
                        <th className="px-3 py-2 font-semibold">Date</th>
                        <th className="px-3 py-2 font-semibold">Libelle</th>
                        <th className="px-3 py-2 font-semibold text-right">
                          Debit
                        </th>
                        <th className="px-3 py-2 font-semibold text-right">
                          Credit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((entry) => (
                        <tr key={entry.id} className="border-t border-border">
                          <td className="px-3 py-2 text-text-secondary">
                            {entry.date}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span>{entry.label}</span>
                              {entry.status === "a-venir" ? (
                                <Badge tone="warn">A venir</Badge>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatXaf(entry.debit)}
                          </td>
                          <td className="px-3 py-2 text-right text-primary">
                            {formatXaf(entry.credit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {tab === "porte-monnaie" ? (
              <div className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {wallets.map((wallet) => {
                    const fill = Math.min(
                      100,
                      (wallet.balance / wallet.cap) * 100,
                    );
                    return (
                      <article
                        key={wallet.id}
                        className="rounded-card border border-border bg-background p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-heading font-semibold text-text-primary">
                            {wallet.label}
                          </p>
                          <Wallet className="h-4 w-4 text-primary" />
                        </div>
                        <p className="mt-2 text-lg font-heading font-bold text-primary">
                          {formatXaf(wallet.balance)}
                        </p>
                        <div className="mt-3 h-2 rounded-full bg-surface">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${fill}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-text-secondary">
                          {wallet.lastOperation}
                        </p>
                      </article>
                    );
                  })}
                </div>

                <Card title="Dernieres operations" className="bg-background">
                  <div className="grid gap-2">
                    {walletHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-card border border-border px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {entry.label}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {entry.date} - {entry.channel}
                          </p>
                        </div>
                        <p
                          className={`text-sm font-semibold ${
                            entry.amount >= 0
                              ? "text-primary"
                              : "text-text-primary"
                          }`}
                        >
                          {entry.amount >= 0 ? "+" : "-"}
                          {formatXaf(Math.abs(entry.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : null}

            {tab === "factures" ? (
              <div className="grid gap-3">
                {invoices.map((invoice) => (
                  <article
                    key={invoice.id}
                    className="rounded-card border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-heading font-semibold text-text-primary">
                          {invoice.document}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          Emise le {invoice.date}
                        </p>
                      </div>
                      <Badge
                        tone={
                          invoice.status === "payee"
                            ? "ok"
                            : invoice.status === "retard"
                              ? "warn"
                              : "neutral"
                        }
                      >
                        {invoice.status === "payee"
                          ? "Payee"
                          : invoice.status === "retard"
                            ? "Retard"
                            : "En attente"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-base font-heading font-bold text-primary">
                        {formatXaf(invoice.amount)}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-3 py-1.5 text-xs"
                        iconLeft={<FileText className="h-3.5 w-3.5" />}
                      >
                        Telecharger PDF
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {tab === "reglement" ? (
              <div className="grid gap-4">
                <div className="grid gap-3">
                  {paymentChannels.map((channel) => (
                    <article
                      key={channel.name}
                      className="rounded-card border border-border bg-background p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-primary" />
                          <p className="text-sm font-heading font-semibold text-text-primary">
                            {channel.name}
                          </p>
                        </div>
                        <Badge tone={channel.badgeTone}>{channel.state}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">
                        {channel.detail}
                      </p>
                    </article>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <article className="rounded-card border border-border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <p className="text-sm font-semibold text-text-primary">
                        Prelevement automatique
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">
                      Canal principal: Orange Money (fin de mois).
                    </p>
                  </article>

                  <article className="rounded-card border border-border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-semibold text-text-primary">
                        Regle de securite
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">
                      Toute modification du mode de reglement est validee par
                      SMS.
                    </p>
                  </article>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    iconLeft={<CreditCard className="h-4 w-4" />}
                  >
                    Ajouter un mode
                  </Button>
                  <Button type="button" variant="secondary">
                    Demander une modification
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
