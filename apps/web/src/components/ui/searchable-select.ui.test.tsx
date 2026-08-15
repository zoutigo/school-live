import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "./searchable-select";

const FEW_OPTIONS: SearchableSelectOption[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

const MANY_OPTIONS: SearchableSelectOption[] = [
  { value: "school-1", label: "Ecole Alpha" },
  { value: "school-2", label: "Ecole Beta" },
  { value: "school-3", label: "College Gamma" },
  { value: "school-4", label: "Lycee Delta" },
  { value: "school-5", label: "Ecole Epsilon" },
  { value: "school-6", label: "College Zeta" },
];

function ControlledSelect({
  options,
  initialValue = "",
  onChange,
}: {
  options: SearchableSelectOption[];
  initialValue?: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      data-testid="test-select"
      placeholder="Choisir..."
    />
  );
}

describe("SearchableSelect", () => {
  it("affiche le placeholder puis la liste des options au clic", () => {
    render(<ControlledSelect options={FEW_OPTIONS} />);

    expect(screen.getByText("Choisir...")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("test-select"));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("ne montre pas de champ de recherche pour 5 options ou moins", () => {
    render(<ControlledSelect options={FEW_OPTIONS} />);
    fireEvent.click(screen.getByTestId("test-select"));

    expect(screen.queryByTestId("test-select-search")).not.toBeInTheDocument();
  });

  it("affiche un champ de recherche des que la liste depasse 5 options et filtre", () => {
    render(<ControlledSelect options={MANY_OPTIONS} />);
    fireEvent.click(screen.getByTestId("test-select"));

    const search = screen.getByTestId("test-select-search");
    expect(search).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "college" } });

    expect(screen.getByText("College Gamma")).toBeInTheDocument();
    expect(screen.getByText("College Zeta")).toBeInTheDocument();
    expect(screen.queryByText("Ecole Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Lycee Delta")).not.toBeInTheDocument();
  });

  it("le filtre ignore accents et casse", () => {
    render(<ControlledSelect options={MANY_OPTIONS} />);
    fireEvent.click(screen.getByTestId("test-select"));

    fireEvent.change(screen.getByTestId("test-select-search"), {
      target: { value: "ECOLE" },
    });

    expect(screen.getByText("Ecole Alpha")).toBeInTheDocument();
    expect(screen.getByText("Ecole Beta")).toBeInTheDocument();
    expect(screen.getByText("Ecole Epsilon")).toBeInTheDocument();
    expect(screen.queryByText("College Gamma")).not.toBeInTheDocument();
  });

  it("affiche le message d'absence de resultat quand rien ne correspond", () => {
    render(<ControlledSelect options={MANY_OPTIONS} />);
    fireEvent.click(screen.getByTestId("test-select"));

    fireEvent.change(screen.getByTestId("test-select-search"), {
      target: { value: "zzz-introuvable" },
    });

    expect(screen.getByText("Aucun resultat")).toBeInTheDocument();
  });

  it("selectionne une option, ferme le panneau et appelle onChange", () => {
    const onChange = vi.fn();
    render(<ControlledSelect options={FEW_OPTIONS} onChange={onChange} />);

    fireEvent.click(screen.getByTestId("test-select"));
    fireEvent.click(screen.getByTestId("test-select-option-b"));

    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ferme le panneau au clic en dehors du composant", () => {
    render(
      <div>
        <ControlledSelect options={FEW_OPTIONS} />
        <button type="button">Ailleurs</button>
      </div>,
    );

    fireEvent.click(screen.getByTestId("test-select"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText("Ailleurs"));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ferme le panneau avec la touche Echap", async () => {
    render(<ControlledSelect options={FEW_OPTIONS} />);

    fireEvent.click(screen.getByTestId("test-select"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("ne s'ouvre pas quand le composant est disabled", () => {
    render(
      <SearchableSelect
        options={FEW_OPTIONS}
        value=""
        onChange={vi.fn()}
        disabled
        data-testid="test-select"
      />,
    );

    fireEvent.click(screen.getByTestId("test-select"));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("expose aria-invalid selon la prop invalid", () => {
    const { rerender } = render(
      <SearchableSelect
        options={FEW_OPTIONS}
        value=""
        onChange={vi.fn()}
        invalid
        data-testid="test-select"
      />,
    );

    expect(screen.getByTestId("test-select")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    rerender(
      <SearchableSelect
        options={FEW_OPTIONS}
        value=""
        onChange={vi.fn()}
        data-testid="test-select"
      />,
    );

    expect(screen.getByTestId("test-select")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });
});
