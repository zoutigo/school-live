import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

configure({ asyncUtilTimeout: 5000 });

if (
  typeof window !== "undefined" &&
  typeof window.ResizeObserver !== "function"
) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverStub,
  });
}

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 900,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
  cleanup();
});
