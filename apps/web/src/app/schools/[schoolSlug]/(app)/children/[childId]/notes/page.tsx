import { StudentNotesPage } from "../../../../../../../components/student-notes/student-notes-page";

export default async function ChildNotesPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; childId: string }>;
}) {
  const { schoolSlug, childId } = await params;

  return <StudentNotesPage schoolSlug={schoolSlug} childId={childId} />;
}
