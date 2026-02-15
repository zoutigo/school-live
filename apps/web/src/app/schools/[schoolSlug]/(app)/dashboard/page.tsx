"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/card";

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
    | "SUPERVISOR"
    | "SCHOOL_ACCOUNTANT"
    | "TEACHER"
    | "PARENT"
    | "STUDENT";
  email?: string;
};

const familyStats = [
  { title: "Messages non lus", value: "3" },
  { title: "Paiements en attente", value: "1" },
  { title: "Documents recents", value: "4" },
];

const teacherStats = [
  { title: "Classes assignees", value: "4" },
  { title: "Copies a corriger", value: "28" },
  { title: "Messages parents", value: "6" },
];

const schoolAdminStats = [
  { title: "Classes actives", value: "18" },
  { title: "Eleves inscrits", value: "1320" },
  { title: "Demandes en attente", value: "11" },
];

export default function DashboardPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    const response = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setMe((await response.json()) as MeResponse);
  }

  return (
    <div className="grid gap-4">
      <Card title="Bienvenue" subtitle="Vue globale de votre espace">
        {me ? (
          <p className="text-text-secondary">
            {me.firstName} {me.lastName} ({me.role})
          </p>
        ) : (
          <p className="text-text-secondary">Chargement du profil...</p>
        )}
      </Card>

      {me?.role === "PARENT" || me?.role === "STUDENT" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {familyStats.map((item) => (
            <Card key={item.title} title={item.title}>
              <p className="font-heading text-2xl font-bold text-primary">
                {item.value}
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {me?.role === "TEACHER" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {teacherStats.map((item) => (
            <Card key={item.title} title={item.title}>
              <p className="font-heading text-2xl font-bold text-primary">
                {item.value}
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {me?.role === "SCHOOL_ADMIN" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {schoolAdminStats.map((item) => (
            <Card key={item.title} title={item.title}>
              <p className="font-heading text-2xl font-bold text-primary">
                {item.value}
              </p>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
