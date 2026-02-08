import Link from 'next/link';

export default async function SchoolPortalPage({
  params
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;

  return (
    <section>
      <p>Portail de l'etablissement.</p>
      <ul>
        <li>
          <Link href={`/schools/${schoolSlug}/login`}>Connexion</Link>
        </li>
        <li>
          <Link href={`/schools/${schoolSlug}/dashboard`}>Dashboard</Link>
        </li>
        <li>
          <Link href={`/schools/${schoolSlug}/grades`}>Notes</Link>
        </li>
      </ul>
    </section>
  );
}
