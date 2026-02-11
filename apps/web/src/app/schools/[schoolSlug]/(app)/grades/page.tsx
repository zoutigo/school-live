"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Grade = {
  id: string;
  value: number;
  maxValue: number;
  term: string;
  subjectId: string;
};

export default function GradesPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const [grades, setGrades] = useState<Grade[]>([]);

  useEffect(() => {
    void loadGrades();
  }, []);

  async function loadGrades() {
    const response = await fetch(`${API_URL}/schools/${schoolSlug}/grades`, {
      credentials: "include",
    });

    if (!response.ok) {
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setGrades((await response.json()) as Grade[]);
  }

  return (
    <Card title="Notes & Devoirs" subtitle="Derniers resultats">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-text-secondary">
              <th className="px-3 py-2 font-medium">Matiere</th>
              <th className="px-3 py-2 font-medium">Note</th>
              <th className="px-3 py-2 font-medium">Periode</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => (
              <tr
                key={grade.id}
                className="border-b border-border text-text-primary last:border-none"
              >
                <td className="px-3 py-2">{grade.subjectId}</td>
                <td className="px-3 py-2">
                  {grade.value}/{grade.maxValue}
                </td>
                <td className="px-3 py-2">{grade.term}</td>
              </tr>
            ))}
            {grades.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-text-secondary" colSpan={3}>
                  Aucune note disponible.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
