import sanitizeHtml from "sanitize-html";

type SanitizeRichTextOptions = {
  allowImages?: boolean;
};

const ALLOWED_STYLE_PATTERNS = {
  color: [/^#[0-9a-f]{3,8}$/i, /^rgb(a)?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
  "background-color": [
    /^#[0-9a-f]{3,8}$/i,
    /^rgb(a)?\([\d\s.,%]+\)$/i,
    /^[a-z]+$/i,
  ],
  "text-align": [/^(left|right|center|justify)$/i],
};

export function sanitizeRichTextHtml(
  input: string | null | undefined,
  options: SanitizeRichTextOptions = {},
) {
  if (!input) {
    return "";
  }

  const allowImages = options.allowImages ?? true;

  return sanitizeHtml(input, {
    allowedTags: [
      "a",
      "blockquote",
      "br",
      "div",
      "em",
      "font",
      "h1",
      "h2",
      "h3",
      "i",
      "li",
      "ol",
      "p",
      "s",
      "span",
      "strike",
      "strong",
      "u",
      "ul",
      ...(allowImages ? ["img"] : []),
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      div: ["style"],
      font: ["color"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      img: allowImages ? ["src", "alt"] : [],
      p: ["style"],
      span: ["style"],
      blockquote: ["style"],
    },
    allowedStyles: {
      div: ALLOWED_STYLE_PATTERNS,
      h1: ALLOWED_STYLE_PATTERNS,
      h2: ALLOWED_STYLE_PATTERNS,
      h3: ALLOWED_STYLE_PATTERNS,
      p: ALLOWED_STYLE_PATTERNS,
      span: ALLOWED_STYLE_PATTERNS,
      blockquote: ALLOWED_STYLE_PATTERNS,
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
    exclusiveFilter(frame) {
      return frame.tag === "img" && !frame.attribs.src;
    },
  }).trim();
}

export function hasMeaningfulRichTextContent(input: string | null | undefined) {
  if (!input) {
    return false;
  }

  return (
    input
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .trim().length > 0
  );
}
