import { computeAgeInYears } from "./age.util.js";

describe("computeAgeInYears", () => {
  it("calcule l'âge quand l'anniversaire est déjà passé cette année", () => {
    expect(
      computeAgeInYears(
        new Date("2015-03-10T00:00:00Z"),
        new Date("2026-08-04T00:00:00Z"),
      ),
    ).toBe(11);
  });

  it("calcule l'âge quand l'anniversaire n'est pas encore passé cette année", () => {
    expect(
      computeAgeInYears(
        new Date("2015-12-25T00:00:00Z"),
        new Date("2026-08-04T00:00:00Z"),
      ),
    ).toBe(10);
  });

  it("gère le jour exact de l'anniversaire (âge incrémenté ce jour-là)", () => {
    expect(
      computeAgeInYears(
        new Date("2015-08-04T00:00:00Z"),
        new Date("2026-08-04T00:00:00Z"),
      ),
    ).toBe(11);
  });

  it("gère un anniversaire le mois courant mais jour pas encore atteint", () => {
    expect(
      computeAgeInYears(
        new Date("2015-08-20T00:00:00Z"),
        new Date("2026-08-04T00:00:00Z"),
      ),
    ).toBe(10);
  });

  it("retourne 0 pour un nourrisson né cette année", () => {
    expect(
      computeAgeInYears(
        new Date("2026-01-15T00:00:00Z"),
        new Date("2026-08-04T00:00:00Z"),
      ),
    ).toBe(0);
  });
});
