"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

type Props = {
  title: string;
  body: string[];
  toggleOpenLabel: string;
  toggleCloseLabel: string;
  testId?: string;
  defaultOpen?: boolean;
};

export function PageHelpBlock({
  title,
  body,
  toggleOpenLabel,
  toggleCloseLabel,
  testId = "page-help-block",
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className="overflow-hidden rounded-card border border-[#BFE3DE] bg-[#EAF6F4]"
      data-testid={testId}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        data-testid={`${testId}-toggle`}
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white">
          <HelpCircle className="h-5 w-5 text-[#247C72]" />
        </span>
        <span className="flex-1 text-sm font-bold text-[#195E56]">
          {open ? toggleCloseLabel : toggleOpenLabel}
        </span>
        {open ? (
          <ChevronUp className="h-[18px] w-[18px] text-[#195E56]" />
        ) : (
          <ChevronDown className="h-[18px] w-[18px] text-[#195E56]" />
        )}
      </button>

      {open ? (
        <div
          className="border-t border-[#D5EEEA] px-4 pb-4 pt-2"
          data-testid={`${testId}-content`}
        >
          <p className="text-sm font-extrabold text-[#195E56]">{title}</p>
          {body.map((paragraph, index) => (
            <p
              key={index}
              className="mt-2 text-justify text-sm leading-relaxed text-text-primary"
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
