'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clearAccessCookie, getAccessTokenCookie } from '../../../../lib/auth-cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type Grade = {
  id: string;
  value: number;
  maxValue: number;
  term: string;
  studentId: string;
  classId: string;
  subjectId: string;
};

export default function SchoolGradesPage() {
  const params = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const schoolSlug = params.schoolSlug;
  const [grades, setGrades] = useState<Grade[]>([]);

  useEffect(() => {
    void loadGrades();
  }, []);

  async function loadGrades() {
    const token = getAccessTokenCookie();

    if (!token) {
      router.push(`/schools/${schoolSlug}/login`);
      return;
    }

    const response = await fetch(`${API_URL}/schools/${schoolSlug}/grades`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      clearAccessCookie();
      router.push(`/schools/${schoolSlug}/login`);
      return;
    }

    const payload = (await response.json()) as Grade[];
    setGrades(payload);
  }

  return (
    <section>
      <h2>Notes</h2>
      <ul>
        {grades.map((grade) => (
          <li key={grade.id}>
            {grade.value}/{grade.maxValue} ({grade.term}) - student {grade.studentId}
          </li>
        ))}
      </ul>
    </section>
  );
}
