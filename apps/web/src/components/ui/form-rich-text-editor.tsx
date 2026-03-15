"use client";

import { RichTextEditor } from "../editor/rich-text-editor";
import { FormField } from "./form-field";

type FormRichTextEditorProps = {
  label: string;
  error?: string | null;
  hint?: string | null;
  invalid?: boolean;
  value?: string;
  onChange: (html: string) => void;
  className?: string;
  editorTestId?: string;
  minHeightClassName?: string;
  allowInlineImages?: boolean;
};

export function FormRichTextEditor({
  label,
  error,
  hint,
  invalid = false,
  value = "",
  onChange,
  className = "",
  editorTestId,
  minHeightClassName,
  allowInlineImages = true,
}: FormRichTextEditorProps) {
  return (
    <FormField
      label={label}
      error={error}
      className={className}
      hint={error ? null : undefined}
    >
      <div
        data-testid={editorTestId}
        aria-invalid={invalid ? "true" : "false"}
        className={`rounded-[14px] transition-all duration-200 ${
          invalid
            ? "border border-notification bg-notification/5 ring-2 ring-notification/20"
            : "border border-transparent"
        }`}
      >
        <RichTextEditor
          initialHtml={value}
          hint={hint ?? undefined}
          minHeightClassName={minHeightClassName}
          allowInlineImages={allowInlineImages}
          onHtmlChange={onChange}
        />
      </div>
    </FormField>
  );
}
