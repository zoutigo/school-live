"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FamilyFeedPage } from "../../../../../components/feed/family-feed-page";
import { Card } from "../../../../../components/ui/card";
import type { FeedViewerRole } from "../../../../../components/feed/types";

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
    | "SCHOOL_STAFF"
    | "TEACHER"
    | "PARENT"
    | "STUDENT";
};

const ALLOWED_ROLES: FeedViewerRole[] = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "SCHOOL_STAFF",
  "TEACHER",
  "PARENT",
  "STUDENT",
];

export default function SchoolFeedPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [viewerRole, setViewerRole] = useState<FeedViewerRole>("PARENT");
  const [schoolName, setSchoolName] = useState<string>(schoolSlug);

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug]);

  async function bootstrap() {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        router.replace(`/schools/${schoolSlug}/login`);
        return;
      }

      const me = (await response.json()) as MeResponse;
      if (!ALLOWED_ROLES.includes(me.role as FeedViewerRole)) {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }

      setViewerRole(me.role as FeedViewerRole);

      try {
        const publicResponse = await fetch(
          `${API_URL}/schools/${schoolSlug}/public`,
          {
            cache: "no-store",
          },
        );
        if (publicResponse.ok) {
          const publicPayload = (await publicResponse.json()) as {
            name?: string;
          };
          const resolved = publicPayload.name?.trim();
          if (resolved) {
            setSchoolName(resolved);
          }
        }
      } catch {
        // Keep slug fallback in title if branding endpoint is unavailable.
      }
    } catch {
      router.replace(`/schools/${schoolSlug}/dashboard`);
      return;
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card title="Fil d'actualite" subtitle="Vie de l'ecole">
        <p className="text-sm text-text-secondary">Chargement...</p>
      </Card>
    );
  }

  return (
    <FamilyFeedPage
      schoolSlug={schoolSlug}
      childFullName={schoolName}
      scopeLabel="la vie de l'ecole"
      viewerRole={viewerRole}
      viewScope="GENERAL"
      headingTitle={`Fil d'actualite general de ${schoolName}`}
      hideSectionLabel
    />
  );
}
