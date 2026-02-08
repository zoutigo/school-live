'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clearAccessCookie, getAccessTokenCookie } from '../../../../lib/auth-cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type MeResponse = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
};

export default function SchoolDashboardPage() {
  const params = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const schoolSlug = params.schoolSlug;
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    void loadMe();
  }, []);

  async function loadMe() {
    const token = getAccessTokenCookie();

    if (!token) {
      router.push(`/schools/${schoolSlug}/login`);
      return;
    }

    const response = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      clearAccessCookie();
      router.push(`/schools/${schoolSlug}/login`);
      return;
    }

    const payload = (await response.json()) as MeResponse;
    setMe(payload);
  }

  function logout() {
    clearAccessCookie();
    router.push(`/schools/${schoolSlug}/login`);
  }

  return (
    <section>
      <h2>Dashboard</h2>
      {me ? (
        <p>
          {me.firstName} {me.lastName} ({me.role})
        </p>
      ) : (
        <p>Chargement...</p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={logout} type="button">
          Logout
        </button>
        <Link href={`/schools/${schoolSlug}/grades`}>Voir les notes</Link>
      </div>
    </section>
  );
}
