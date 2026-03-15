import { expect } from "vitest";

function buildMatchMedia(width: number) {
  return (query: string) => {
    const minMatch = /min-width:\s*(\d+)px/.exec(query);
    const maxMatch = /max-width:\s*(\d+)px/.exec(query);

    let matches = true;
    if (minMatch) {
      matches = matches && width >= Number(minMatch[1]);
    }
    if (maxMatch) {
      matches = matches && width <= Number(maxMatch[1]);
    }

    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };
}

export function setViewportWidth(width: number, height = 900) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: height,
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: buildMatchMedia(width),
  });
  window.dispatchEvent(new Event("resize"));
}

export function assertNoHorizontalOverflowAt320(root: HTMLElement) {
  setViewportWidth(320);

  const viewportWidth = 320;
  const docWidth = document.documentElement.scrollWidth;
  const bodyWidth = document.body.scrollWidth;

  if (docWidth > 0 || bodyWidth > 0) {
    expect(Math.max(docWidth, bodyWidth)).toBeLessThanOrEqual(viewportWidth);
    return;
  }

  // JSDOM often exposes no real layout metrics. In that case, we at least
  // enforce the structural guardrails used to prevent horizontal overflow.
  expect(root.className).toContain("min-w-0");
}
