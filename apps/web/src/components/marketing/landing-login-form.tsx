"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

type LoginResponse = {
  schoolSlug: string | null;
  csrfToken?: string;
};

type ApiErrorPayload = {
  code?: string;
  schoolSlug?: string | null;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export function LandingLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const payload = (await response.json()) as ApiErrorPayload;
          const messageObject =
            typeof payload.message === "object" && payload.message
              ? payload.message
              : null;
          const code = payload.code ?? messageObject?.code ?? null;
          const forcedSchoolSlug =
            payload.schoolSlug ?? messageObject?.schoolSlug ?? null;

          if (code === "PASSWORD_CHANGE_REQUIRED") {
            const params = new URLSearchParams({ email });
            if (forcedSchoolSlug) {
              params.set("schoolSlug", forcedSchoolSlug);
            }
            router.push(`/first-password?${params.toString()}`);
            return;
          }

          if (code === "PROFILE_SETUP_REQUIRED") {
            const params = new URLSearchParams({ email });
            if (forcedSchoolSlug) {
              params.set("schoolSlug", forcedSchoolSlug);
            }
            router.push(`/profile-setup?${params.toString()}`);
            return;
          }
        }

        throw new Error("Email ou mot de passe invalide");
      }

      (await response.json()) as LoginResponse;

      const meResponse = await fetch(`${API_URL}/me`, {
        credentials: "include",
      });

      if (!meResponse.ok) {
        throw new Error("Session invalide apres connexion");
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
        throw new Error("Aucune ecole associee a ce compte");
      }

      router.push(`/schools/${me.schoolSlug}/dashboard`);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Erreur de connexion",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <label className="grid gap-1 text-sm">
        <span className="text-text-secondary">Email</span>
        <input
          className="rounded-card border border-border bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="prenom.nom@gmail.com"
          required
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="text-text-secondary">Mot de passe</span>
        <input
          className="rounded-card border border-border bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error ? <p className="text-sm text-notification">{error}</p> : null}

      <Button type="submit" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
