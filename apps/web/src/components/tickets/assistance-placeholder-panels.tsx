import { MessageCircle } from "lucide-react";
import type { AssistanceModuleTabKey } from "./assistance-module-tabs";
import { AssistanceFaqPanel } from "./assistance-faq-panel";
import { AssistanceGuidePanel } from "./assistance-guide-panel";

type Props = {
  tab: Exclude<AssistanceModuleTabKey, "bug">;
  schoolName?: string | null;
};

export function AssistancePlaceholderPanels({ tab, schoolName }: Props) {
  if (tab === "guide") {
    return <AssistanceGuidePanel />;
  }

  if (tab === "faq") {
    return <AssistanceFaqPanel />;
  }

  return (
    <section
      className="rounded-[20px] border border-warm-border bg-surface p-4 shadow-card sm:p-5"
      data-testid="assistance-chat-panel"
    >
      <div className="mb-4 flex items-center gap-2 text-primary">
        <MessageCircle className="h-5 w-5" />
        <h2 className="text-base font-bold text-text-primary">
          Chat assistance
        </h2>
      </div>
      <p className="mb-3 text-sm text-text-secondary">
        Vue de chat en onglet, adaptée web desktop et mobile.
      </p>
      <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-[14px] border border-warm-border bg-warm-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Conversations
          </p>
          <div className="mt-2 space-y-2 text-sm text-text-primary">
            <p className="rounded-[10px] border border-primary/20 bg-primary/10 px-2 py-2">
              Support Scolive
            </p>
            <p className="rounded-[10px] border border-warm-border bg-background px-2 py-2">
              {schoolName ? `Équipe ${schoolName}` : "Équipe école"}
            </p>
          </div>
        </div>
        <div className="rounded-[14px] border border-warm-border bg-background p-3">
          <p className="text-sm text-text-secondary">
            Bonjour, je rencontre un souci de connexion sur mon compte parent.
          </p>
          <p className="mt-3 rounded-[10px] bg-primary/10 px-3 py-2 text-sm text-text-primary">
            Merci, pouvez-vous confirmer votre identifiant et l'heure du
            problème ?
          </p>
          <div className="mt-4 rounded-[10px] border border-warm-border bg-surface px-3 py-2 text-sm text-text-secondary">
            Zone de saisie message…
          </div>
        </div>
      </div>
    </section>
  );
}
