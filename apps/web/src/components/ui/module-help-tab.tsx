"use client";

import { useTranslation } from "../../i18n/useTranslation";

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
  const { t } = useTranslation();

  return (
    <div className="grid gap-4">
      <div className="content-panel p-4">
        <p className="text-sm font-heading font-semibold text-text-primary">
          {t("help.purpose")}
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          <span className="font-medium text-text-primary">{moduleName}</span> :{" "}
          {moduleSummary}
        </p>
      </div>

      <div className="grid gap-3">
        {actions.map((action) => (
          <div key={action.name} className="content-panel p-4">
            <p className="text-sm font-heading font-semibold text-text-primary">
              {action.name}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {t("help.why")}
              </span>{" "}
              {action.purpose}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {t("help.how")}
              </span>{" "}
              {action.howTo}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {t("help.moduleImpact")}
              </span>{" "}
              {action.moduleImpact}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {t("help.crossModuleImpact")}
              </span>{" "}
              {action.crossModuleImpact}
            </p>
          </div>
        ))}
      </div>

      {tips.length > 0 ? (
        <div className="content-panel p-4">
          <p className="text-sm font-heading font-semibold text-text-primary">
            {t("help.tips")}
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
