/**
 * Données partagées : établissements secondaires du Mfoundi (Yaoundé) utilisés
 * par seed-mfoundi-schools.mjs et seed-mfoundi-resources.mjs.
 *
 * Source : ecole-secondaire-mfoundi.pdf, "Liste complète des établissements
 * secondaires du Mfoundi" (DDES Mfoundi), colonnes
 * [Nom | Arrondissement | Création | Type | Ordre | Système].
 *
 * languageSystem : seul l'établissement explicitement marqué "Bilingue" dans
 * la colonne Système du PDF reçoit BILINGUAL ; tous les autres établissements
 * du Mfoundi (division de Yaoundé, zone francophone, aucune mention
 * "Anglophone" dans la source) reçoivent FRANCOPHONE par défaut.
 */

export const MFOUNDI_SCHOOLS = [
  {
    name: "Ayungha Bilingual College",
    arrondissement: "Yaoundé 5",
    foundedYear: 2000,
    schoolType: "GENERAL",
    ownership: "Laïc",
    languageSystem: "BILINGUAL",
  },
  {
    name: "Lycée Technique Charles Atangana",
    arrondissement: "Yaoundé 1",
    foundedYear: 1952,
    schoolType: "TECHNICAL",
    ownership: "Public",
    languageSystem: "FRANCOPHONE",
  },
  {
    name: "Collège Frantz Fanon",
    arrondissement: "Yaoundé 4",
    foundedYear: 2006,
    schoolType: "GENERAL",
    ownership: "Laïc",
    languageSystem: "FRANCOPHONE",
  },
  {
    name: "Collège Benigna d'Etoudi",
    arrondissement: null,
    foundedYear: 1969,
    schoolType: "GENERAL",
    ownership: "Catholique",
    languageSystem: "FRANCOPHONE",
  },
  {
    name: "Baptist Secondary School Yaoundé",
    arrondissement: null,
    foundedYear: 2008,
    schoolType: "GENERAL",
    ownership: "Protestant",
    languageSystem: "FRANCOPHONE",
  },
];

export function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
