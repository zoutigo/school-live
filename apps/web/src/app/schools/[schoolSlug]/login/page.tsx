'use client';

import { FormEvent, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { setAccessCookie } from '../../../../lib/auth-cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type LoginResponse = {
  accessToken: string;
  expiresIn: number;
};

export default function SchoolLoginPage() {
  const router = useRouter();
  const params = useParams<{ schoolSlug: string }>();
  const schoolSlug = params.schoolSlug;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`${API_URL}/schools/${schoolSlug}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      setError('Identifiants invalides');
      return;
    }

    const payload = (await response.json()) as LoginResponse;
    setAccessCookie(payload.accessToken, payload.expiresIn);
    router.push(`/schools/${schoolSlug}/dashboard`);
  }

  return (
    <section>
      <h2>Connexion</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="mot de passe"
          required
        />
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        <button type="submit">Se connecter</button>
      </form>
    </section>
  );
}
