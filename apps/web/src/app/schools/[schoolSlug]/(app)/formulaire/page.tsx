"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
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

export default function ParentFormulairePage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="grid gap-4">
      <Card
        title="Formulaire"
        subtitle={
          me
            ? `${me.firstName} ${me.lastName} - suivi des formulaires`
            : "Chargement..."
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : (
          <div className="rounded-card border border-dashed border-border bg-background px-4 py-10 text-center">
            <span className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface text-primary">
              <ClipboardList className="h-5 w-5" />
            </span>
            <p className="text-base font-heading font-semibold text-text-primary">
              Aucun formulaire a remplir pour l&apos;instant
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Lorsqu&apos;un nouveau formulaire sera publie par
              l&apos;etablissement, il apparaitra ici.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
