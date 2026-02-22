"use client";

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
} from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

type Props = {
  initialHtml?: string;
  minHeightClassName?: string;
  hint?: string;
  onTextChange?: (text: string) => void;
  onHtmlChange?: (html: string) => void;
  onUploadInlineImage?: (file: File) => Promise<string>;
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
      hint = "Astuce: utilisez les styles de titre et les listes pour une lecture plus claire.",
      onTextChange,
      onHtmlChange,
      onUploadInlineImage,
    },
    ref,
  ) {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const inlineImageInputRef = useRef<HTMLInputElement | null>(null);
    const textColorInputRef = useRef<HTMLInputElement | null>(null);
    const bgColorInputRef = useRef<HTMLInputElement | null>(null);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!editorRef.current) {
        return;
      }
      editorRef.current.innerHTML = initialHtml;
      onTextChange?.(editorRef.current.innerText ?? "");
      onHtmlChange?.(editorRef.current.innerHTML ?? "");
    }, [initialHtml, onTextChange, onHtmlChange]);

    useImperativeHandle(ref, () => ({
      clear() {
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
          onTextChange?.("");
          onHtmlChange?.("");
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
      onTextChange?.(editorRef.current?.innerText ?? "");
      onHtmlChange?.(editorRef.current?.innerHTML ?? "");
    }

    function applyCommand(command: string, value?: string) {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      syncEditorState();
    }

    async function handleInlineImageFile(file: File) {
      if (!file.type.startsWith("image/")) {
        setError("Le fichier selectionne n'est pas une image.");
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        setError("Image trop lourde (max 8 Mo).");
        return;
      }

      if (!onUploadInlineImage) {
        setError("Upload image indisponible.");
        return;
      }

      setError(null);
      try {
        const imageUrl = await onUploadInlineImage(file);
        insertImage(imageUrl, file.name);
      } catch (error) {
        setError(resolveUploadErrorMessage(error));
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
      img.style.borderRadius = "8px";
      img.style.margin = "8px 0";

      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);

      syncEditorState();
    }

    return (
      <div className="grid gap-0 rounded-card border border-border bg-surface">
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
              const url = window.prompt("Lien");
              if (url) {
                applyCommand("createLink", url);
              }
            }}
            icon={Link2}
          />
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
          <label className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-text-secondary">
            <Pilcrow className="h-3.5 w-3.5" />
            <select
              defaultValue="P"
              onChange={(event) =>
                applyCommand("formatBlock", event.target.value)
              }
              className="bg-transparent text-xs text-text-secondary outline-none"
            >
              <option value="P">Paragraphe</option>
              <option value="H1">Titre 1</option>
              <option value="H2">Titre 2</option>
              <option value="H3">Titre 3</option>
              <option value="BLOCKQUOTE">Citation</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => textColorInputRef.current?.click()}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-text-secondary transition hover:bg-primary/10 hover:text-primary"
            title="Couleur du texte"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-text-secondary transition hover:bg-primary/10 hover:text-primary"
            title="Surlignage"
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
          className={`${minHeightClassName} p-3 text-sm text-text-primary outline-none`}
        />
        <p className="border-t border-border px-3 py-2 text-xs text-text-secondary">
          {hint}
        </p>
        {error ? (
          <p className="px-3 pb-3 text-sm text-notification">{error}</p>
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
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-text-secondary transition hover:bg-primary/10 hover:text-primary"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function resolveUploadErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Impossible d'uploader l'image.";
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />;
}
