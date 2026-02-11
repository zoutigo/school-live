import Link from "next/link";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { LandingLoginForm } from "../components/marketing/landing-login-form";

const features = [
  {
    title: "Suivi des notes",
    description: "Consultez resultats, moyennes et progression en temps reel.",
  },
  {
    title: "Messagerie centralisee",
    description:
      "Echanges familles, eleves et equipe pedagogique en un seul endroit.",
  },
  {
    title: "Paiements simplifies",
    description: "Reglez cantine, sorties et frais scolaires en ligne.",
  },
  {
    title: "Vie scolaire",
    description: "Absences, emploi du temps, documents et informations utiles.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-card bg-primary font-heading font-bold text-surface">
              SL
            </span>
            <span className="font-heading text-lg font-semibold">
              School-Live
            </span>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-14 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h1 className="max-w-3xl font-heading text-4xl font-bold leading-tight text-text-primary md:text-5xl">
              La plateforme numerique de votre etablissement scolaire
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-text-secondary">
              Notes, messages, paiements et vie scolaire en un seul endroit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="px-6 py-3 text-base">
                Telecharger l'application
              </Button>
              <Link href="/schools/demo">
                <Button className="px-6 py-3 text-base" variant="secondary">
                  Decouvrir un portail
                </Button>
              </Link>
            </div>
          </div>

          <Card title="Connexion" subtitle="Accedez a votre compte School-Live">
            <LandingLoginForm />
          </Card>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <Card
            title="Une plateforme pensee pour les ecoles"
            subtitle="Un environnement scolaire moderne et connecte"
          >
            <img
              src="/images/camer-school1.png"
              alt="Eleves africains dans une ecole moderne"
              className="h-[380px] w-full rounded-card border border-border object-cover object-center"
            />
            <p className="mt-4 text-sm text-text-secondary">
              School-Live valorise la reussite des apprenants avec des outils
              numeriques clairs, accessibles et adaptes au quotidien scolaire.
            </p>
          </Card>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-4 px-6 pb-16 md:grid-cols-2">
          {features.map((feature) => (
            <Card
              key={feature.title}
              title={feature.title}
              subtitle={feature.description}
            >
              <p className="text-sm text-text-secondary">
                School-Live centralise vos interactions ecole-famille.
              </p>
            </Card>
          ))}
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <Card
            title="Application mobile School-Live"
            subtitle="Disponible sur iOS et Android"
          >
            <p className="mb-4 text-sm text-text-secondary">
              Restez connecte a la vie scolaire de votre etablissement depuis
              votre mobile.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button>Telecharger sur App Store</Button>
              <Button variant="secondary">Telecharger sur Google Play</Button>
            </div>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 text-sm text-text-secondary">
          © {new Date().getFullYear()} School-Live
        </div>
      </footer>
    </div>
  );
}
