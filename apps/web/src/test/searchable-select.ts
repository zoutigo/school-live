import { fireEvent, screen } from "@testing-library/react";

/**
 * Opens a SearchableSelect by its accessible label/aria-label and picks the
 * option matching optionLabel. Waits for the option to appear so it does not
 * race the async data fetch feeding the options list on first render.
 */
export async function selectSearchableOption(
  triggerLabel: string,
  optionLabel: string,
) {
  fireEvent.click(screen.getByLabelText(triggerLabel));
  fireEvent.click(await screen.findByRole("option", { name: optionLabel }));
}
