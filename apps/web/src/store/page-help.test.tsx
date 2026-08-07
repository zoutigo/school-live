import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePageHelp, usePageHelpStore } from "./page-help";

function Registrar({ title }: { title: string }) {
  usePageHelp({ title, sections: [{ title: "S1", body: ["B1"] }] });
  return null;
}

describe("usePageHelpStore / usePageHelp", () => {
  beforeEach(() => {
    usePageHelpStore.setState({ entry: null, open: false });
  });

  it("registers content on mount and clears it on unmount", () => {
    const { unmount } = render(<Registrar title="Santé" />);

    expect(usePageHelpStore.getState().entry?.title).toBe("Santé");

    unmount();

    expect(usePageHelpStore.getState().entry).toBeNull();
  });

  it("openHelp/closeHelp toggle the open flag", () => {
    render(<Registrar title="Santé" />);

    usePageHelpStore.getState().openHelp();
    expect(usePageHelpStore.getState().open).toBe(true);

    usePageHelpStore.getState().closeHelp();
    expect(usePageHelpStore.getState().open).toBe(false);
  });

  it("updates content when the title changes without leaking a stale entry", () => {
    const { rerender } = render(<Registrar title="Santé" />);
    expect(usePageHelpStore.getState().entry?.title).toBe("Santé");

    rerender(<Registrar title="Notes" />);
    expect(usePageHelpStore.getState().entry?.title).toBe("Notes");
  });
});
