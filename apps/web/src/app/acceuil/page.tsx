"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { Card } from "../../components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type MeResponse = {
  firstName: string;
  lastName: string;
  role:
    | "SUPER_ADMIN"
    | "ADMIN"
    | "SALES"
    | "SUPPORT"
    | "SCHOOL_ADMIN"
    | "SCHOOL_MANAGER"
    | "SCHOOL_ACCOUNTANT"
    | "TEACHER"
    | "PARENT"
    | "STUDENT";
  email?: string;
  schoolSlug: string | null;
};

const kpis = [
  { label: "Ecoles actives", value: "24" },
  { label: "Utilisateurs", value: "4 182" },
  { label: "Connexions du jour", value: "1 036" },
];

export default function AcceuilPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMe();
  }, []);

  async function loadMe() {
    const response = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      router.replace("/");
      return;
    }

    const payload = (await response.json()) as MeResponse;

    if (payload.role !== "SUPER_ADMIN" && payload.role !== "ADMIN") {
      if (payload.schoolSlug) {
        router.replace(`/schools/${payload.schoolSlug}/dashboard`);
        return;
      }

      router.replace("/");
      return;
    }

    setMe(payload);
    setLoading(false);
  }

  return (
    <AppShell schoolName="School-Live Platform">
      <div className="grid gap-4">
        <Card
          title="Acceuil administration"
          subtitle="Pilotage global de la plateforme"
        >
          {loading ? (
            <p className="text-text-secondary">Chargement...</p>
          ) : (
            <p className="text-sm text-text-secondary">
              Connecte:{" "}
              <span className="font-medium text-text-primary">
                {me?.firstName} {me?.lastName}
              </span>{" "}
              ({me?.role})
            </p>
          )}
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {kpis.map((item) => (
            <Card key={item.label} title={item.label}>
              <p className="font-heading text-2xl font-bold text-primary">
                {item.value}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
