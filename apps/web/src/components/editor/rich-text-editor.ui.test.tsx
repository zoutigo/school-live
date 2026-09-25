import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichTextEditor, type RichTextEditorRef } from "./rich-text-editor";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEditor(container: HTMLElement): HTMLElement {
  const el = container.querySelector(
    '[contenteditable="true"]',
  ) as HTMLElement | null;
  if (!el) throw new Error("contenteditable div not found");
  return el;
}

function injectImg(
  editor: HTMLElement,
  src = "http://example.com/photo.jpg",
  style = "width:100%;max-width:100%;height:auto;display:block;",
): HTMLImageElement {
  const img = document.createElement("img");
  img.src = src;
  img.style.cssText = style;
  editor.appendChild(img);
  return img;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const noopUpload = vi.fn().mockResolvedValue("http://example.com/img.jpg");

// ── Tests — rendu de base ─────────────────────────────────────────────────────

describe("RichTextEditor — rendu", () => {
  it("affiche la zone contenteditable", () => {
    const { container } = render(
      <RichTextEditor onTextChange={vi.fn()} onHtmlChange={vi.fn()} />,
    );
    expect(getEditor(container)).toBeTruthy();
  });

  it("applique la classe min-height par défaut", () => {
    const { container } = render(<RichTextEditor />);
    expect(getEditor(container).className).toContain("min-h-[220px]");
  });

  it("applique overflow-x-hidden sur l'éditeur", () => {
    const { container } = render(<RichTextEditor />);
    expect(getEditor(container).className).toContain("overflow-x-hidden");
  });

  it("affiche le bouton image quand allowInlineImages=true", () => {
    render(
      <RichTextEditor
        allowInlineImages={true}
        onUploadInlineImage={noopUpload}
      />,
    );
    expect(
      document.querySelector('input[type="file"][accept="image/*"]'),
    ).toBeTruthy();
  });

  it("n'affiche pas d'input image quand allowInlineImages=false", () => {
    render(<RichTextEditor allowInlineImages={false} />);
    expect(
      document.querySelector('input[type="file"][accept="image/*"]'),
    ).toBeNull();
  });
});

// ── Tests — insertion d'image ─────────────────────────────────────────────────

describe("RichTextEditor — insertion d'image", () => {
  it("insère une image avec display:block, height:auto, maxWidth:100% et width:100%", async () => {
    const onHtmlChange = vi.fn();
    const { container } = render(
      <RichTextEditor
        allowInlineImages={true}
        onUploadInlineImage={noopUpload}
        onHtmlChange={onHtmlChange}
      />,
    );

    const fileInput = container.querySelector(
      'input[type="file"][accept="image/*"]',
    ) as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(["(binary)"], "photo.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      const editor = getEditor(container);
      const img = editor.querySelector("img");
      expect(img).toBeTruthy();
      expect(img?.style.display).toBe("block");
      expect(img?.style.height).toBe("auto");
      expect(img?.style.maxWidth).toBe("100%");
      expect(img?.style.width).toBe("100%");
    });
  });
});

// ── Tests — toolbar image flottant ───────────────────────────────────────────

describe("RichTextEditor — toolbar image flottant", () => {
  it("n'affiche pas le toolbar image par défaut", () => {
    render(<RichTextEditor />);
    expect(screen.queryByTestId("image-toolbar")).toBeNull();
  });

  it("affiche le toolbar quand on clique sur une image dans l'éditeur", () => {
    const { container } = render(
      <RichTextEditor
        allowInlineImages={true}
        onUploadInlineImage={noopUpload}
      />,
    );
    const editor = getEditor(container);
    const img = injectImg(editor);

    fireEvent.click(img);
    expect(screen.getByTestId("image-toolbar")).toBeTruthy();
  });

  it("cache le toolbar quand on clique en dehors d'une image", () => {
    const { container } = render(
      <RichTextEditor
        allowInlineImages={true}
        onUploadInlineImage={noopUpload}
      />,
    );
    const editor = getEditor(container);
    const img = injectImg(editor);

    fireEvent.click(img);
    expect(screen.getByTestId("image-toolbar")).toBeTruthy();

    fireEvent.click(editor);
    expect(screen.queryByTestId("image-toolbar")).toBeNull();
  });

  it("applique outline de sélection sur l'image cliquée", () => {
    const { container } = render(
      <RichTextEditor
        allowInlineImages={true}
        onUploadInlineImage={noopUpload}
      />,
    );
    const editor = getEditor(container);
    const img = injectImg(editor);

    fireEvent.click(img);
    expect(img.style.outline).toContain("2px solid");
  });

  it("retire l'outline de sélection après fermeture du toolbar", () => {
    const { container } = render(
      <RichTextEditor
        allowInlineImages={true}
        onUploadInlineImage={noopUpload}
      />,
    );
    const editor = getEditor(container);
    const img = injectImg(editor);

    fireEvent.click(img);
    expect(img.style.outline).toContain("2px solid");

    fireEvent.click(editor);
    expect(img.style.outline).toBe("");
  });

  it("affiche les boutons de taille 25%, 50%, 75%, 100%", () => {
    const { container } = render(
      <RichTextEditor
        allowInlineImages={true}
        onUploadInlineImage={noopUpload}
      />,
    );
    const editor = getEditor(container);
    const img = injectImg(editor);
    fireEvent.click(img);

    const toolbar = screen.getByTestId("image-toolbar");
    expect(toolbar.textContent).toContain("25%");
    expect(toolbar.textContent).toContain("50%");
    expect(toolbar.textContent).toContain("75%");
    expect(toolbar.textContent).toContain("100%");
  });

  it("applique width:50% sur l'image après clic sur le bouton 50%", () => {
    const onHtmlChange = vi.fn();
    const { container } = render(
      <RichTextEditor
        allowInlineImages={true}
        onUploadInlineImage={noopUpload}
        onHtmlChange={onHtmlChange}
      />,
    );
    const editor = getEditor(container);
    const img = injectImg(editor);
    fireEvent.click(img);

    const toolbar = screen.getByTestId("image-toolbar");
    const btn50 = Array.from(toolbar.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "50%",
    );
    expect(btn50).toBeTruthy();
    fireEvent.click(btn50!);

    expect(img.style.width).toBe("50%");
    expect(img.style.height).toBe("auto");
  });

  it("applique float:none margin:auto sur l'image après clic alignement centre", () => {
    const onHtmlChange = vi.fn();
    const { container } = render(
      <RichTextEditor
        allowInlineImages={true}
        onUploadInlineImage={noopUpload}
        onHtmlChange={onHtmlChange}
      />,
    );
    const editor = getEditor(container);
    const img = injectImg(editor);
    fireEvent.click(img);

    const toolbar = screen.getByTestId("image-toolbar");
    const centerBtn = Array.from(toolbar.querySelectorAll("button")).find(
      (b) => b.title === "Centrer",
    );
    expect(centerBtn).toBeTruthy();
    fireEvent.click(centerBtn!);

    expect(img.style.float).toBe("none");
    expect(img.style.marginLeft).toBe("auto");
    expect(img.style.marginRight).toBe("auto");
  });

  it("applique float:left après clic alignement gauche", () => {
    const { container } = render(
      <RichTextEditor
        allowInlineImages={true}
        onUploadInlineImage={noopUpload}
      />,
    );
    const editor = getEditor(container);
    const img = injectImg(editor);
    fireEvent.click(img);

    const toolbar = screen.getByTestId("image-toolbar");
    const leftBtn = Array.from(toolbar.querySelectorAll("button")).find(
      (b) => b.title === "Aligner à gauche",
    );
    expect(leftBtn).toBeTruthy();
    fireEvent.click(leftBtn!);

    expect(img.style.float).toBe("left");
  });

  it("supprime l'image et ferme le toolbar via le bouton supprimer", () => {
    const onHtmlChange = vi.fn();
    const { container } = render(
      <RichTextEditor
        allowInlineImages={true}
        onUploadInlineImage={noopUpload}
        onHtmlChange={onHtmlChange}
      />,
    );
    const editor = getEditor(container);
    const img = injectImg(editor);
    expect(editor.querySelector("img")).toBeTruthy();

    fireEvent.click(img);
    expect(screen.getByTestId("image-toolbar")).toBeTruthy();

    const toolbar = screen.getByTestId("image-toolbar");
    const deleteBtn = Array.from(toolbar.querySelectorAll("button")).find(
      (b) => b.title === "Supprimer l'image",
    );
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn!);

    expect(editor.querySelector("img")).toBeNull();
    expect(screen.queryByTestId("image-toolbar")).toBeNull();
  });

  it("ferme le toolbar via le bouton Fermer sans supprimer l'image", () => {
    const { container } = render(
      <RichTextEditor
        allowInlineImages={true}
        onUploadInlineImage={noopUpload}
      />,
    );
    const editor = getEditor(container);
    const img = injectImg(editor);
    fireEvent.click(img);
    expect(screen.getByTestId("image-toolbar")).toBeTruthy();

    const toolbar = screen.getByTestId("image-toolbar");
    const closeBtn = Array.from(toolbar.querySelectorAll("button")).find(
      (b) => b.title === "Fermer",
    );
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn!);

    expect(screen.queryByTestId("image-toolbar")).toBeNull();
    expect(editor.querySelector("img")).toBeTruthy();
  });
});

// ── Tests — ref API ───────────────────────────────────────────────────────────

describe("RichTextEditor — ref API", () => {
  it("clear() vide l'éditeur", () => {
    const ref = React.createRef<RichTextEditorRef>();
    const { container } = render(
      <RichTextEditor ref={ref} initialHtml="<p>Hello</p>" />,
    );
    const editor = getEditor(container);
    expect(editor.innerHTML).toContain("Hello");

    act(() => ref.current?.clear());
    expect(editor.innerHTML).toBe("");
  });

  it("getHtml() retourne le HTML courant", () => {
    const ref = React.createRef<RichTextEditorRef>();
    const { container } = render(
      <RichTextEditor ref={ref} initialHtml="<p>Test</p>" />,
    );
    getEditor(container);
    const html = ref.current?.getHtml();
    expect(html).toContain("Test");
  });
});

// ── Tests — contenu contrôlé (régression texte inversé) ─────────────────────
//
// FormRichTextEditor pilote `initialHtml` avec un state React mis à jour à
// chaque frappe via onHtmlChange (pattern value/onChange contrôlé). Si l'effet
// qui synchronise `initialHtml` vers le DOM réassignait innerHTML à chaque
// rendu — même quand le contenu n'a pas changé depuis l'extérieur — le
// navigateur replaçait le curseur en tête de l'éditeur, et chaque caractère
// tapé s'insérait avant les précédents : le texte apparaissait à l'envers.

function ControlledEditor({
  initial = "",
  onChange,
}: {
  initial?: string;
  onChange?: (html: string) => void;
}) {
  const [value, setValue] = React.useState(initial);
  return (
    <RichTextEditor
      initialHtml={value}
      onHtmlChange={(html) => {
        setValue(html);
        onChange?.(html);
      }}
    />
  );
}

describe("RichTextEditor — contenu contrôlé (régression texte inversé)", () => {
  it("ne réinjecte pas innerHTML quand le HTML contrôlé revient identique après une frappe", () => {
    const { container } = render(<ControlledEditor initial="<p>A</p>" />);
    const editor = getEditor(container);

    // Espionne le setter innerHTML de CE noeud éditeur uniquement : un
    // vrai navigateur ne recrée pas l'arbre DOM à chaque frappe (il mute
    // le noeud texte en place), donc simuler la frappe avec innerHTML
    // détruirait de toute façon les noeuds — ce qui ne teste pas la bonne
    // chose. Ce qu'on veut vérifier, c'est que l'effet React ne réassigne
    // PAS innerHTML une fois que le HTML contrôlé revenu de onHtmlChange
    // correspond déjà au contenu du DOM.
    const descriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "innerHTML",
    )!;
    const setSpy = vi.fn();
    Object.defineProperty(editor, "innerHTML", {
      configurable: true,
      get() {
        return descriptor.get!.call(editor);
      },
      set(v: string) {
        setSpy(v);
        descriptor.set!.call(editor, v);
      },
    });

    // Simule une frappe utilisateur réelle : seul le noeud texte est muté,
    // puis "input" est émis. syncEditorState relaie ce HTML via
    // onHtmlChange, ce qui re-render le composant avec un initialHtml
    // désormais identique au DOM courant.
    act(() => {
      editor.textContent = "AB";
      fireEvent.input(editor);
    });

    expect(setSpy).not.toHaveBeenCalled();
    expect(editor.textContent).toBe("AB");
  });

  it("insère les caractères tapés successivement dans l'ordre, sans les inverser", () => {
    const { container } = render(<ControlledEditor initial="" />);
    const editor = getEditor(container);

    const word = "Epreuve";
    let typed = "";
    for (const char of word) {
      typed += char;
      act(() => {
        // Simule l'ajout d'un caractère en fin de contenu, comme le ferait
        // une vraie frappe clavier avec le curseur en fin de texte.
        editor.textContent = typed;
        fireEvent.input(editor);
      });
    }

    expect(editor.textContent).toBe(word);
    expect(editor.textContent).not.toBe(word.split("").reverse().join(""));
  });

  it("met bien à jour le DOM quand initialHtml change depuis l'extérieur (changement de contenu)", () => {
    const { container, rerender } = render(
      <RichTextEditor initialHtml="<p>Premier</p>" />,
    );
    const editor = getEditor(container);
    expect(editor.textContent).toBe("Premier");

    rerender(<RichTextEditor initialHtml="<p>Second</p>" />);
    expect(editor.textContent).toBe("Second");
  });
});
