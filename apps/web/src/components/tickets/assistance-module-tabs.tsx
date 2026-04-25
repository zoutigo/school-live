"use client";

import { BookOpen, Bug, CircleHelp, MessageCircle } from "lucide-react";

export type AssistanceModuleTabKey = "guide" | "faq" | "bug" | "chat";

type AssistanceModuleTab = {
  key: AssistanceModuleTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ASSISTANCE_MODULE_TABS: AssistanceModuleTab[] = [
  { key: "guide", label: "Guide", icon: BookOpen },
  { key: "faq", label: "FAQ", icon: CircleHelp },
  { key: "bug", label: "Bug", icon: Bug },
  { key: "chat", label: "Chat", icon: MessageCircle },
];

type Props = {
  activeTab: AssistanceModuleTabKey;
  onSelectTab: (tab: AssistanceModuleTabKey) => void;
};

export function AssistanceModuleTabs({ activeTab, onSelectTab }: Props) {
  return (
    <div
      className="overflow-x-auto rounded-[16px] border border-warm-border bg-[linear-gradient(180deg,rgba(255,253,252,1)_0%,rgba(255,248,240,0.94)_100%)] p-1 shadow-[0_10px_20px_rgba(77,56,32,0.06)]"
      data-testid="assistance-module-tabs"
    >
      <div className="flex min-w-max gap-1">
        {ASSISTANCE_MODULE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-[12px] border px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-transparent text-text-secondary hover:border-warm-border hover:bg-warm-highlight/70 hover:text-text-primary"
              }`}
              data-testid={`assistance-module-tab-${tab.key}`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
