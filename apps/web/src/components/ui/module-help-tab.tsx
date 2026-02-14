type ModuleHelpAction = {
  name: string;
  purpose: string;
  howTo: string;
  moduleImpact: string;
  crossModuleImpact: string;
};

type ModuleHelpTabProps = {
  moduleName: string;
  moduleSummary: string;
  actions: ModuleHelpAction[];
  tips?: string[];
};

export function ModuleHelpTab({
  moduleName,
  moduleSummary,
  actions,
  tips = [],
}: ModuleHelpTabProps) {
  return (
    <div className="grid gap-4">
      <div className="rounded-card border border-border bg-background p-4">
        <p className="text-sm font-heading font-semibold text-text-primary">
          A quoi sert ce module ?
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          <span className="font-medium text-text-primary">{moduleName}</span> :{" "}
          {moduleSummary}
        </p>
      </div>

      <div className="grid gap-3">
        {actions.map((action) => (
          <div
            key={action.name}
            className="rounded-card border border-border bg-background p-4"
          >
            <p className="text-sm font-heading font-semibold text-text-primary">
              {action.name}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Pour quoi ?</span>{" "}
              {action.purpose}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Comment ?</span>{" "}
              {action.howTo}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                Consequence dans le module :
              </span>{" "}
              {action.moduleImpact}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                Consequence sur les autres modules :
              </span>{" "}
              {action.crossModuleImpact}
            </p>
          </div>
        ))}
      </div>

      {tips.length > 0 ? (
        <div className="rounded-card border border-border bg-background p-4">
          <p className="text-sm font-heading font-semibold text-text-primary">
            Repere rapide
          </p>
          <ul className="mt-2 grid gap-1 text-sm text-text-secondary">
            {tips.map((tip) => (
              <li key={tip}>- {tip}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
