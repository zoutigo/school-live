/**
 * Tests unitaires : résolution du rôle actif effectif.
 *
 * Contexte du bug corrigé : un utilisateur mono-rôle (ex: PARENT sur une
 * seule école) n'a jamais l'occasion de déclencher PUT /me/active-role (le
 * sélecteur de rôle mobile/web ne s'affiche que si plusieurs rôles sont
 * disponibles), donc User.activeRole reste NULL en base indéfiniment. Sans
 * fallback, tout endpoint qui teste AuthenticatedUser.activeRole brut
 * (ex: timetable) le traite comme "aucun rôle" et renvoie 403, alors que
 * /me affichait déjà son rôle correctement grâce à ce même fallback.
 */

import {
  getPrimaryRole,
  resolveActiveRole,
} from "./resolve-active-role.util.js";

describe("resolveActiveRole", () => {
  it("falls back to the only available role when activeRole is null (mono-role account)", () => {
    expect(resolveActiveRole(null, [], ["PARENT"])).toBe("PARENT");
  });

  it("returns the persisted preferred role when it is still allowed", () => {
    expect(resolveActiveRole("TEACHER", [], ["TEACHER", "PARENT"])).toBe(
      "TEACHER",
    );
  });

  it("falls back to the primary role when the persisted role is no longer assigned", () => {
    expect(resolveActiveRole("TEACHER", [], ["PARENT"])).toBe("PARENT");
  });

  it("prioritizes platform roles over school roles in the fallback", () => {
    expect(resolveActiveRole(null, ["ADMIN"], ["PARENT"])).toBe("ADMIN");
  });

  it("returns null when the user has no role at all", () => {
    expect(resolveActiveRole(null, [], [])).toBeNull();
  });
});

describe("getPrimaryRole", () => {
  it("prefers SCHOOL_ADMIN over TEACHER and PARENT", () => {
    expect(getPrimaryRole([], ["TEACHER", "PARENT", "SCHOOL_ADMIN"])).toBe(
      "SCHOOL_ADMIN",
    );
  });

  it("returns null for empty role lists", () => {
    expect(getPrimaryRole([], [])).toBeNull();
  });
});
