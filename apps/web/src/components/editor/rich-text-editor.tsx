"use client";

import React from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRight,
  Eraser,
  Highlighter,
  ImagePlus,
  Video,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Strikethrough,
  Trash2,
  Type,
  X,
} from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useTranslation } from "../../i18n/useTranslation";

type Props = {
  initialHtml?: string;
  minHeightClassName?: string;
  hint?: string | undefined;
  allowInlineImages?: boolean;
  allowInlineVideos?: boolean;
  onTextChange?: (text: string) => void;
  onHtmlChange?: (html: string) => void;
  onUploadInlineImage?: (file: File) => Promise<string>;
  onUploadInlineVideo?: (file: File) => Promise<string>;
};

export type RichTextEditorRef = {
  clear: () => void;
  focus: () => void;
  getHtml: () => string;
  getText: () => string;
};

export const RichTextEditor = forwardRef<RichTextEditorRef, Props>(
  function RichTextEditor(
    {
      initialHtml = "",
      minHeightClassName = "min-h-[220px]",
      hint,
      allowInlineImages = true,
      allowInlineVideos = false,
      onTextChange,
      onHtmlChange,
      onUploadInlineImage,
      onUploadInlineVideo,
    },
    ref,
  ) {
    const { t } = useTranslation();
    const resolvedHint = hint ?? t("editor.hint");
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<HTMLDivElement | null>(null);
    const inlineImageInputRef = useRef<HTMLInputElement | null>(null);
    const inlineVideoInputRef = useRef<HTMLInputElement | null>(null);
    const textColorInputRef = useRef<HTMLInputElement | null>(null);
    const bgColorInputRef = useRef<HTMLInputElement | null>(null);
    const onTextChangeRef = useRef(onTextChange);
    const onHtmlChangeRef = useRef(onHtmlChange);

    const [error, setError] = useState<string | null>(null);
    const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(
      null,
    );
    const [imgToolbarPos, setImgToolbarPos] = useState<{
      top: number;
      left: number;
    } | null>(null);

    useEffect(() => {
      onTextChangeRef.current = onTextChange;
      onHtmlChangeRef.current = onHtmlChange;
    }, [onTextChange, onHtmlChange]);

    useEffect(() => {
      if (!editorRef.current) {
        return;
      }
      editorRef.current.innerHTML = initialHtml;
      onTextChangeRef.current?.(editorRef.current.innerText ?? "");
      onHtmlChangeRef.current?.(editorRef.current.innerHTML ?? "");
    }, [initialHtml]);

    useImperativeHandle(ref, () => ({
      clear() {
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
          onTextChangeRef.current?.("");
          onHtmlChangeRef.current?.("");
        }
      },
      focus() {
        editorRef.current?.focus();
      },
      getHtml() {
        return editorRef.current?.innerHTML ?? "";
      },
      getText() {
        return editorRef.current?.innerText ?? "";
      },
    }));

    function syncEditorState() {
      onTextChangeRef.current?.(editorRef.current?.innerText ?? "");
      onHtmlChangeRef.current?.(editorRef.current?.innerHTML ?? "");
    }

    const dismissImageToolbar = useCallback(() => {
      if (selectedImg) {
        selectedImg.style.outline = "";
      }
      setSelectedImg(null);
      setImgToolbarPos(null);
    }, [selectedImg]);

    function selectImage(img: HTMLImageElement) {
      if (selectedImg && selectedImg !== img) {
        selectedImg.style.outline = "";
      }
      img.style.outline = "2px solid #0C5FA8";
      img.style.outlineOffset = "2px";
      setSelectedImg(img);

      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const wrapRect = wrapper.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      const TOOLBAR_HEIGHT = 44;
      let top = imgRect.top - wrapRect.top - TOOLBAR_HEIGHT - 4;
      if (top < 0) top = imgRect.bottom - wrapRect.top + 4;
      const left = Math.max(0, imgRect.left - wrapRect.left);
      setImgToolbarPos({ top, left });
    }

    function handleEditorClick(event: React.MouseEvent<HTMLDivElement>) {
      const target = event.target as HTMLElement;
      if (target.tagName === "IMG") {
        event.stopPropagation();
        selectImage(target as HTMLImageElement);
      } else {
        dismissImageToolbar();
      }
    }

    function applyImageWidth(percent: number) {
      if (!selectedImg) return;
      selectedImg.style.width = `${percent}%`;
      selectedImg.style.maxWidth = `${percent}%`;
      selectedImg.style.height = "auto";
      selectedImg.style.display = "block";
      syncEditorState();
    }

    function applyImageAlign(align: "left" | "center" | "right") {
      if (!selectedImg) return;
      selectedImg.style.display = "block";
      if (align === "left") {
        selectedImg.style.float = "left";
        selectedImg.style.marginLeft = "0";
        selectedImg.style.marginRight = "12px";
      } else if (align === "right") {
        selectedImg.style.float = "right";
        selectedImg.style.marginRight = "0";
        selectedImg.style.marginLeft = "12px";
      } else {
        selectedImg.style.float = "none";
        selectedImg.style.marginLeft = "auto";
        selectedImg.style.marginRight = "auto";
      }
      syncEditorState();
    }

    function deleteSelectedImage() {
      if (!selectedImg) return;
      selectedImg.remove();
      setSelectedImg(null);
      setImgToolbarPos(null);
      syncEditorState();
    }

    function applyCommand(command: string, value?: string) {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      syncEditorState();
    }

    async function handleInlineImageFile(file: File) {
      if (!file.type.startsWith("image/")) {
        setError(t("editor.errorNotImage"));
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        setError(t("editor.errorImageSize"));
        return;
      }

      if (!onUploadInlineImage) {
        setError(t("editor.errorImageUpload"));
        return;
      }

      setError(null);
      try {
        const imageUrl = await onUploadInlineImage(file);
        insertImage(imageUrl, file.name);
      } catch (err) {
        setError(
          resolveUploadErrorMessage(err, t("editor.errorUploadFallback")),
        );
      }
    }

    async function handleInlineVideoFile(file: File) {
      if (!file.type.startsWith("video/")) {
        setError(t("editor.errorNotVideo"));
        return;
      }

      if (file.size > 80 * 1024 * 1024) {
        setError(t("editor.errorVideoSize"));
        return;
      }

      if (!onUploadInlineVideo) {
        setError(t("editor.errorVideoUpload"));
        return;
      }

      setError(null);
      try {
        const videoUrl = await onUploadInlineVideo(file);
        insertVideo(videoUrl, file.name);
      } catch (err) {
        setError(
          resolveUploadErrorMessage(err, t("editor.errorUploadFallback")),
        );
      }
    }

    function insertImage(src: string, alt: string) {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      editor.focus();

      const selection = window.getSelection();
      const range =
        selection && selection.rangeCount > 0
          ? selection.getRangeAt(0)
          : document.createRange();

      if (!selection || selection.rangeCount === 0) {
        range.selectNodeContents(editor);
        range.collapse(false);
      }

      const img = document.createElement("img");
      img.src = src;
      img.alt = alt;
      img.style.maxWidth = "100%";
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      img.style.borderRadius = "8px";
      img.style.margin = "8px 0";

      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);

      syncEditorState();
    }

    function insertVideo(src: string, title: string) {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      editor.focus();

      const selection = window.getSelection();
      const range =
        selection && selection.rangeCount > 0
          ? selection.getRangeAt(0)
          : document.createRange();

      if (!selection || selection.rangeCount === 0) {
        range.selectNodeContents(editor);
        range.collapse(false);
      }

      const video = document.createElement("video");
      video.src = src;
      video.controls = true;
      video.style.maxWidth = "100%";
      video.style.borderRadius = "8px";
      video.style.margin = "8px 0";
      video.setAttribute("title", title);

      range.insertNode(video);
      range.setStartAfter(video);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);

      syncEditorState();
    }

    return (
      <div
        ref={wrapperRef}
        className="relative grid gap-0 rounded-[20px] border border-warm-border bg-[linear-gradient(180deg,rgba(255,253,252,1)_0%,rgba(255,248,240,0.96)_100%)] shadow-[0_14px_30px_rgba(77,56,32,0.07)]"
      >
        {selectedImg && imgToolbarPos ? (
          <div
            data-testid="image-toolbar"
            style={{ top: imgToolbarPos.top, left: imgToolbarPos.left }}
            className="absolute z-50 flex items-center gap-1 rounded-[12px] border border-warm-border bg-surface px-2 py-1 shadow-[0_4px_16px_rgba(47,36,24,0.15)]"
          >
            <span className="mr-1 text-xs font-semibold text-text-secondary">
              {t("editor.imageToolbar.size")}
            </span>
            {([25, 50, 75, 100] as const).map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => applyImageWidth(pct)}
                className="rounded-[8px] border border-warm-border bg-warm-surface px-1.5 py-0.5 text-xs text-text-primary transition hover:bg-primary hover:text-white"
              >
                {pct}%
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-warm-border" />
            <button
              type="button"
              onClick={() => applyImageAlign("left")}
              title={t("editor.imageToolbar.alignLeft")}
              className="rounded-[8px] border border-warm-border bg-warm-surface px-1.5 py-0.5 text-xs text-text-primary transition hover:bg-primary hover:text-white"
            >
              ⇤
            </button>
            <button
              type="button"
              onClick={() => applyImageAlign("center")}
              title={t("editor.imageToolbar.alignCenter")}
              className="rounded-[8px] border border-warm-border bg-warm-surface px-1.5 py-0.5 text-xs text-text-primary transition hover:bg-primary hover:text-white"
            >
              ⇔
            </button>
            <button
              type="button"
              onClick={() => applyImageAlign("right")}
              title={t("editor.imageToolbar.alignRight")}
              className="rounded-[8px] border border-warm-border bg-warm-surface px-1.5 py-0.5 text-xs text-text-primary transition hover:bg-primary hover:text-white"
            >
              ⇥
            </button>
            <span className="mx-1 h-4 w-px bg-warm-border" />
            <button
              type="button"
              onClick={deleteSelectedImage}
              title={t("editor.imageToolbar.delete")}
              className="rounded-[8px] border border-notification/30 bg-notification/5 px-1.5 py-0.5 text-xs text-notification transition hover:bg-notification hover:text-white"
            >
              <Trash2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={dismissImageToolbar}
              title={t("editor.imageToolbar.close")}
              className="rounded-[8px] border border-warm-border bg-warm-surface px-1 py-0.5 text-xs text-text-secondary transition hover:bg-warm-highlight"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          <ToolbarBtn onClick={() => applyCommand("undo")} icon={ArrowLeft} />
          <ToolbarBtn onClick={() => applyCommand("redo")} icon={ArrowRight} />
          <ToolbarDivider />
          <ToolbarBtn onClick={() => applyCommand("bold")} icon={Type} />
          <ToolbarBtn onClick={() => applyCommand("italic")} icon={Italic} />
          <ToolbarBtn onClick={() => applyCommand("underline")} icon={Eraser} />
          <ToolbarBtn
            onClick={() => applyCommand("strikeThrough")}
            icon={Strikethrough}
          />
          <ToolbarDivider />
          <ToolbarBtn
            onClick={() => applyCommand("insertUnorderedList")}
            icon={List}
          />
          <ToolbarBtn
            onClick={() => applyCommand("insertOrderedList")}
            icon={ListOrdered}
          />
          <ToolbarBtn
            onClick={() => applyCommand("outdent")}
            icon={IndentDecrease}
          />
          <ToolbarBtn
            onClick={() => applyCommand("indent")}
            icon={IndentIncrease}
          />
          <ToolbarDivider />
          <ToolbarBtn
            onClick={() => {
              const url = window.prompt(t("editor.linkPrompt"));
              if (url) {
                applyCommand("createLink", url);
              }
            }}
            icon={Link2}
          />
          {allowInlineImages ? (
            <>
              <ToolbarBtn
                onClick={() => inlineImageInputRef.current?.click()}
                icon={ImagePlus}
              />
              <input
                ref={inlineImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event: ChangeEvent<HTMLInputElement>) => {
                  const input = event.currentTarget;
                  const file = event.target.files?.[0];
                  if (file) {
                    await handleInlineImageFile(file);
                  }
                  input.value = "";
                }}
              />
            </>
          ) : null}
          {allowInlineVideos ? (
            <>
              <ToolbarBtn
                onClick={() => inlineVideoInputRef.current?.click()}
                icon={Video}
              />
              <input
                ref={inlineVideoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={async (event: ChangeEvent<HTMLInputElement>) => {
                  const input = event.currentTarget;
                  const file = event.target.files?.[0];
                  if (file) {
                    await handleInlineVideoFile(file);
                  }
                  input.value = "";
                }}
              />
            </>
          ) : null}
          <ToolbarDivider />
          <ToolbarBtn
            onClick={() => applyCommand("justifyLeft")}
            icon={AlignLeft}
          />
          <ToolbarBtn
            onClick={() => applyCommand("justifyCenter")}
            icon={AlignCenter}
          />
          <ToolbarBtn
            onClick={() => applyCommand("justifyRight")}
            icon={AlignRight}
          />
          <ToolbarBtn
            onClick={() => applyCommand("justifyFull")}
            icon={AlignJustify}
          />
          <ToolbarDivider />
          <label className="inline-flex items-center gap-1 rounded-[12px] border border-warm-border bg-warm-surface px-2 py-1 text-xs text-text-secondary">
            <Pilcrow className="h-3.5 w-3.5" />
            <select
              defaultValue="P"
              onChange={(event) =>
                applyCommand("formatBlock", event.target.value)
              }
              className="bg-transparent text-xs text-text-secondary outline-none"
            >
              <option value="P">{t("editor.blockParagraph")}</option>
              <option value="H1">{t("editor.blockH1")}</option>
              <option value="H2">{t("editor.blockH2")}</option>
              <option value="H3">{t("editor.blockH3")}</option>
              <option value="BLOCKQUOTE">{t("editor.blockQuote")}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => textColorInputRef.current?.click()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] border border-warm-border bg-warm-surface text-text-secondary transition hover:bg-warm-highlight hover:text-primary"
            title={t("editor.textColor")}
          >
            <Type className="h-4 w-4" />
          </button>
          <input
            ref={textColorInputRef}
            type="color"
            className="hidden"
            onChange={(event) => applyCommand("foreColor", event.target.value)}
          />
          <button
            type="button"
            onClick={() => bgColorInputRef.current?.click()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] border border-warm-border bg-warm-surface text-text-secondary transition hover:bg-warm-highlight hover:text-primary"
            title={t("editor.highlight")}
          >
            <Highlighter className="h-4 w-4" />
          </button>
          <input
            ref={bgColorInputRef}
            type="color"
            className="hidden"
            onChange={(event) =>
              applyCommand("hiliteColor", event.target.value)
            }
          />
          <ToolbarDivider />
          <ToolbarBtn
            onClick={() => applyCommand("removeFormat")}
            icon={Trash2}
          />
        </div>
        <div
          ref={editorRef}
          contentEditable
          onInput={syncEditorState}
          onClick={handleEditorClick}
          className={`${minHeightClassName} overflow-x-hidden p-4 text-sm text-text-primary outline-none`}
        />
        <p className="border-t border-border px-4 py-3 text-xs text-text-secondary">
          {resolvedHint}
        </p>
        {error ? (
          <p className="px-4 pb-4 text-sm text-notification">{error}</p>
        ) : null}
      </div>
    );
  },
);

function ToolbarBtn({
  onClick,
  icon: Icon,
}: {
  onClick: () => void;
  icon: typeof Type;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] border border-warm-border bg-warm-surface text-text-secondary transition hover:bg-warm-highlight hover:text-primary"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function resolveUploadErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px bg-warm-border" aria-hidden="true" />;
}
