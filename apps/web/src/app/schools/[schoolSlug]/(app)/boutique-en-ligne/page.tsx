"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BookMarked,
  CreditCard,
  Minus,
  Plus,
  Shirt,
  ShoppingCart,
  Smartphone,
  Ticket,
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

type ShopItem = {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  category: "cantine" | "fournitures" | "uniforme" | "activites";
  icon: "ticket" | "book" | "shirt" | "card";
  stock: string;
};

const shopItems: ShopItem[] = [
  {
    id: "it-1",
    title: "Recharge cantine (1 semaine)",
    subtitle: "Repas midi - eleve interne/externe",
    price: 7500,
    category: "cantine",
    icon: "ticket",
    stock: "Disponible",
  },
  {
    id: "it-2",
    title: "Carte cantine (remplacement)",
    subtitle: "En cas de perte ou deterioration",
    price: 3000,
    category: "cantine",
    icon: "card",
    stock: "Disponible",
  },
  {
    id: "it-3",
    title: "Pack cahiers + carnet",
    subtitle: "Lot de rentree (primaire/college)",
    price: 12500,
    category: "fournitures",
    icon: "book",
    stock: "Stock limite",
  },
  {
    id: "it-4",
    title: "Polo uniforme ecole",
    subtitle: "Tailles 8 ans a XL",
    price: 10000,
    category: "uniforme",
    icon: "shirt",
    stock: "Disponible",
  },
  {
    id: "it-5",
    title: "Participation sortie pedagogique",
    subtitle: "Musee national - Yaounde",
    price: 15000,
    category: "activites",
    icon: "ticket",
    stock: "Jusqu'au 10 mars",
  },
  {
    id: "it-6",
    title: "Manuel mathematiques (3e)",
    subtitle: "Edition ecole partenaire",
    price: 8500,
    category: "fournitures",
    icon: "book",
    stock: "Disponible",
  },
];

function formatXaf(amount: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}

function iconFor(item: ShopItem) {
  if (item.icon === "book") {
    return <BookMarked className="h-4 w-4 text-primary" />;
  }
  if (item.icon === "shirt") {
    return <Shirt className="h-4 w-4 text-primary" />;
  }
  if (item.icon === "card") {
    return <CreditCard className="h-4 w-4 text-primary" />;
  }
  return <Ticket className="h-4 w-4 text-primary" />;
}

export default function ParentShopPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [filter, setFilter] = useState<ShopItem["category"] | "all">("all");
  const [cart, setCart] = useState<Record<string, number>>({});

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

  const visibleItems = useMemo(
    () =>
      filter === "all"
        ? shopItems
        : shopItems.filter((item) => item.category === filter),
    [filter],
  );

  const cartRows = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const item = shopItems.find((entry) => entry.id === id);
          if (!item) {
            return null;
          }
          return {
            ...item,
            qty,
            total: item.price * qty,
          };
        })
        .filter((entry) => entry !== null),
    [cart],
  );

  const cartCount = useMemo(
    () => cartRows.reduce((sum, row) => sum + row.qty, 0),
    [cartRows],
  );
  const subtotal = useMemo(
    () => cartRows.reduce((sum, row) => sum + row.total, 0),
    [cartRows],
  );
  const fee = useMemo(() => (subtotal > 0 ? 250 : 0), [subtotal]);
  const total = useMemo(() => subtotal + fee, [subtotal, fee]);

  function addOne(itemId: string) {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? 0) + 1,
    }));
  }

  function removeOne(itemId: string) {
    setCart((prev) => {
      const current = prev[itemId] ?? 0;
      if (current <= 1) {
        const rest = { ...prev };
        delete rest[itemId];
        return rest;
      }
      return {
        ...prev,
        [itemId]: current - 1,
      };
    });
  }

  return (
    <div className="grid gap-4">
      <Card
        title="Boutique en ligne"
        subtitle={
          me
            ? `${me.firstName} ${me.lastName} - achats scolaires et reglements rapides`
            : "Chargement..."
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : (
          <div className="grid gap-4">
            <div className="rounded-card border border-primary/25 bg-gradient-to-br from-[#E8F4FF] via-[#F4FAFF] to-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    Panier actuel
                  </p>
                  <p className="mt-1 text-xl font-heading font-bold text-primary">
                    {cartCount} article{cartCount > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="rounded-full bg-surface p-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>

            <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
              {(
                [
                  { key: "all", label: "Tout" },
                  { key: "cantine", label: "Cantine" },
                  { key: "fournitures", label: "Fournitures" },
                  { key: "uniforme", label: "Uniformes" },
                  { key: "activites", label: "Activites" },
                ] as const
              ).map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setFilter(entry.key)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-heading font-semibold ${
                    filter === entry.key
                      ? "border-primary bg-primary text-surface"
                      : "border-border bg-surface text-text-secondary"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
              <section className="grid gap-3">
                {visibleItems.map((item) => {
                  const qty = cart[item.id] ?? 0;
                  return (
                    <article
                      key={item.id}
                      className="rounded-card border border-border bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface">
                            {iconFor(item)}
                          </span>
                          <div>
                            <p className="text-sm font-heading font-semibold text-text-primary">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs text-text-secondary">
                              {item.subtitle}
                            </p>
                            <p className="mt-1 text-xs text-text-secondary">
                              {item.stock}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-heading font-bold text-primary">
                          {formatXaf(item.price)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border border-border bg-surface">
                          <button
                            type="button"
                            onClick={() => removeOne(item.id)}
                            className="inline-flex h-8 w-8 items-center justify-center text-text-secondary transition-colors hover:text-primary"
                            aria-label={`Retirer ${item.title}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-8 text-center text-sm font-semibold text-text-primary">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => addOne(item.id)}
                            className="inline-flex h-8 w-8 items-center justify-center text-text-secondary transition-colors hover:text-primary"
                            aria-label={`Ajouter ${item.title}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <Button
                          type="button"
                          className="px-3 py-1.5 text-xs"
                          onClick={() => addOne(item.id)}
                          iconLeft={<ShoppingCart className="h-3.5 w-3.5" />}
                        >
                          Ajouter
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </section>

              <aside className="h-fit rounded-card border border-border bg-background p-4 lg:sticky lg:top-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-heading font-semibold text-text-primary">
                    Votre panier
                  </p>
                  <span className="rounded-full bg-surface px-2 py-1 text-xs font-semibold text-primary">
                    {cartCount}
                  </span>
                </div>

                {cartRows.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    Votre panier est vide pour le moment.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {cartRows.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-card border border-border px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-text-primary">
                          {row.title}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {row.qty} x {formatXaf(row.price)}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-primary">
                          {formatXaf(row.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 grid gap-1 border-t border-border pt-3 text-sm">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span>Sous-total</span>
                    <span>{formatXaf(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-text-secondary">
                    <span>Frais de service</span>
                    <span>{formatXaf(fee)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between font-heading text-base font-bold text-primary">
                    <span>Total</span>
                    <span>{formatXaf(total)}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  <Button
                    type="button"
                    disabled={cartRows.length === 0}
                    iconLeft={<Smartphone className="h-4 w-4" />}
                  >
                    Payer avec Orange Money
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={cartRows.length === 0}
                    iconLeft={<Smartphone className="h-4 w-4" />}
                  >
                    Payer avec MTN MoMo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={cartRows.length === 0}
                    iconLeft={<CreditCard className="h-4 w-4" />}
                  >
                    Reserver et payer en cash
                  </Button>
                </div>
              </aside>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
