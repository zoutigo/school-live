"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "../../../../../components/ui/button";
import { Card } from "../../../../../components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type LoginResponse = {
  csrfToken?: string;
};

type ApiErrorPayload = {
  message?: string | { code?: string; schoolSlug?: string | null };
};

type MeResponse = {
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
  schoolSlug: string | null;
};

export default function SchoolLoginPage() {
  const router = useRouter();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      if (!response.ok) {
        if (response.status === 403) {
          const payload = (await response.json()) as ApiErrorPayload;
          const message = payload.message;
          const code = typeof message === "object" ? message?.code : null;
          const forcedSchoolSlug =
            typeof message === "object" ? message?.schoolSlug : null;

          if (code === "PASSWORD_CHANGE_REQUIRED") {
            const params = new URLSearchParams({ email });
            if (forcedSchoolSlug ?? schoolSlug) {
              params.set("schoolSlug", forcedSchoolSlug ?? schoolSlug);
            }
            router.push(`/first-password?${params.toString()}`);
            return;
          }

          if (code === "PROFILE_SETUP_REQUIRED") {
            const params = new URLSearchParams({ email });
            if (forcedSchoolSlug ?? schoolSlug) {
              params.set("schoolSlug", forcedSchoolSlug ?? schoolSlug);
            }
            router.push(`/profile-setup?${params.toString()}`);
            return;
          }
        }

        setError("Identifiants invalides");
        return;
      }

      (await response.json()) as LoginResponse;

      const meResponse = await fetch(`${API_URL}/me`, {
        credentials: "include",
      });

      if (!meResponse.ok) {
        setError("Session invalide apres connexion");
        return;
      }

      const me = (await meResponse.json()) as MeResponse;

      if (
        me.role === "SUPER_ADMIN" ||
        me.role === "ADMIN" ||
        me.role === "SALES" ||
        me.role === "SUPPORT"
      ) {
        router.push("/acceuil");
        return;
      }

      if (!me.schoolSlug) {
        setError("Aucune ecole associee a ce compte");
        return;
      }

      router.push(`/schools/${me.schoolSlug}/dashboard`);
    } catch {
      setError("Erreur de connexion");
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card title="Connexion" subtitle="Accedez a votre espace School-Live">
          <form className="grid gap-3" onSubmit={onSubmit}>
            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">Adresse email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="prenom.nom@gmail.com"
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">Mot de passe</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}

            <Button type="submit">Se connecter</Button>
            <Link
              href={`/schools/${schoolSlug}`}
              className="text-sm text-text-secondary"
            >
              Retour au portail
            </Link>
          </form>
        </Card>

        <Card title="Une ecole moderne, connectee et inclusive">
          <img
            src="/images/camer-school2.png"
            alt="Eleves dans une classe africaine moderne"
            className="h-[420px] w-full rounded-card border border-border object-cover object-center"
          />
        </Card>
      </div>
    </div>
  );
}
