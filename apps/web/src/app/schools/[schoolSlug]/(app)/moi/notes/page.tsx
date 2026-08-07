"use client";

import { useParams } from "next/navigation";
import { StudentNotesPage } from "../../../../../../components/student-notes/student-notes-page";

export default function MyNotesPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  return <StudentNotesPage schoolSlug={schoolSlug} />;
}
