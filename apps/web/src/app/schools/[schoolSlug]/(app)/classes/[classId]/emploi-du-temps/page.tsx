import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    schoolSlug: string;
    classId: string;
  }>;
};

export default async function ClassTimetableAliasPage({ params }: PageProps) {
  const { schoolSlug, classId } = await params;
  redirect(`/schools/${schoolSlug}/classes/${classId}/agenda`);
}
