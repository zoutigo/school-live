"use client";

import React from "react";
import { useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "./button";
import { useTranslation } from "../../i18n/useTranslation";

type Section = { title: string; body: string[] };

type Props = {
  open: boolean;
  title: string;
  body?: string[];
  sections?: Section[];
  onClose: () => void;
};

export function HelpDialog({ open, title, body, sections, onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("common.closeConfirmation")}
        className="absolute inset-0 bg-[#2f2418]/40 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        data-testid="help-dialog"
        className="relative w-full max-w-md rounded-[24px] border border-warm-border bg-[linear-gradient(180deg,rgba(255,253,252,1)_0%,rgba(255,248,240,1)_100%)] p-6 shadow-[0_24px_60px_rgba(47,36,24,0.18)]"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#efcfaa] bg-[#fff3e4] text-[#b7793a]">
            <HelpCircle className="h-5 w-5" />
          </div>
          <h2
            id="help-dialog-title"
            className="font-heading text-lg font-semibold text-text-primary"
          >
            {title}
          </h2>
        </div>
        <div
          className="grid max-h-[60vh] gap-4 overflow-y-auto"
          data-testid="help-dialog-body"
        >
          {sections && sections.length > 0
            ? sections.map((section, index) => (
                <div
                  key={index}
                  className="border-l-2 border-[#BFE3DE] pl-3"
                  data-testid={`help-dialog-section-${index}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-[#195E56]">
                    {section.title}
                  </p>
                  {section.body.map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraphIndex}
                      className="mt-1 text-justify text-sm text-text-secondary"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))
            : (body ?? []).map((paragraph, index) => (
                <p
                  key={index}
                  className="text-justify text-sm text-text-secondary"
                >
                  {paragraph}
                </p>
              ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            data-testid="help-dialog-close"
          >
            {t("feed.help.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
