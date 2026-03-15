import {
  hasMeaningfulRichTextContent,
  sanitizeRichTextHtml,
} from "../src/common/rich-text-sanitizer";

describe("rich text sanitizer", () => {
  it("removes script handlers and javascript urls", () => {
    expect(
      sanitizeRichTextHtml(
        '<p onclick="alert(1)">Bonjour</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
      ),
    ).toBe(
      '<p>Bonjour</p><a rel="noopener noreferrer" target="_blank">bad</a>',
    );
  });

  it("keeps basic formatting and safe links", () => {
    expect(
      sanitizeRichTextHtml(
        '<h2 style="text-align:center">Titre</h2><p><strong>Texte</strong> <a href="https://example.com">Lien</a></p>',
      ),
    ).toBe(
      '<h2 style="text-align:center">Titre</h2><p><strong>Texte</strong> <a href="https://example.com" rel="noopener noreferrer" target="_blank">Lien</a></p>',
    );
  });

  it("strips images when a field does not allow them", () => {
    expect(
      sanitizeRichTextHtml('<p>Consigne</p><img src="https://cdn/img.png" />', {
        allowImages: false,
      }),
    ).toBe("<p>Consigne</p>");
  });

  it("detects empty rich text content", () => {
    expect(hasMeaningfulRichTextContent("<p><br></p>")).toBe(false);
    expect(hasMeaningfulRichTextContent("<p>&nbsp;</p>")).toBe(false);
    expect(hasMeaningfulRichTextContent("<p>Consigne</p>")).toBe(true);
  });
});
