export type Locale = "fr" | "en";

export const SUPPORTED_LOCALES: Locale[] = ["fr", "en"];

export const DEFAULT_LOCALE: Locale = "fr";

/**
 * Translation dictionaries, namespaced (e.g. "common.save", "header.logout").
 * Keep `en` keys aligned with `fr` keys: useTranslation falls back fr -> key.
 */
export const translations: Record<Locale, Record<string, string>> = {
  fr: {
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.back": "Retour",
    "common.loading": "Chargement...",
    "common.apply": "Appliquer",

    "settings.title": "Parametres",
    "settings.subtitle": "Preferences de navigation",
    "settings.tab.navigation": "Navigation",
    "settings.tab.help": "Aide",
    "settings.tab.staff": "Personnel",
    "settings.tab.language": "Langue",
    "settings.language.title": "Langue",
    "settings.language.subtitle": "Choisissez la langue de l'interface",
    "settings.language.hint":
      "La langue choisie est appliquee immediatement et conservee sur ce navigateur.",
    "settings.language.fr": "Francais",
    "settings.language.en": "Anglais",

    "header.portal.admin": "Portail administration",
    "header.portal.school": "Portail etablissement",
    "header.portal.teacher": "Portail enseignant",
    "header.portal.family": "Portail famille",
    "header.role.superAdmin": "Super admin",
    "header.role.admin": "Admin",
    "header.role.sales": "Commercial",
    "header.role.support": "Support",
    "header.role.schoolAdmin": "Admin ecole",
    "header.role.schoolManager": "Gestionnaire ecole",
    "header.role.supervisor": "Superviseur",
    "header.role.schoolAccountant": "Comptable",
    "header.role.schoolStaff": "Staff",
    "header.role.teacher": "Enseignant",
    "header.role.parent": "Parent",
    "header.role.student": "Eleve",
    "header.adminDashboardTitle": "Dashboard d'administration de la plateforme",
    "header.notifications": "Notifications",
    "header.account": "Compte utilisateur",
    "header.logout": "Se deconnecter",
    "header.openMenu": "Ouvrir le menu",
  },
  en: {
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.back": "Back",
    "common.loading": "Loading...",
    "common.apply": "Apply",

    "settings.title": "Settings",
    "settings.subtitle": "Navigation preferences",
    "settings.tab.navigation": "Navigation",
    "settings.tab.help": "Help",
    "settings.tab.staff": "Staff",
    "settings.tab.language": "Language",
    "settings.language.title": "Language",
    "settings.language.subtitle": "Choose the interface language",
    "settings.language.hint":
      "The selected language is applied immediately and saved on this browser.",
    "settings.language.fr": "French",
    "settings.language.en": "English",

    "header.portal.admin": "Administration portal",
    "header.portal.school": "School portal",
    "header.portal.teacher": "Teacher portal",
    "header.portal.family": "Family portal",
    "header.role.superAdmin": "Super admin",
    "header.role.admin": "Admin",
    "header.role.sales": "Sales",
    "header.role.support": "Support",
    "header.role.schoolAdmin": "School admin",
    "header.role.schoolManager": "School manager",
    "header.role.supervisor": "Supervisor",
    "header.role.schoolAccountant": "Accountant",
    "header.role.schoolStaff": "Staff",
    "header.role.teacher": "Teacher",
    "header.role.parent": "Parent",
    "header.role.student": "Student",
    "header.adminDashboardTitle": "Platform administration dashboard",
    "header.notifications": "Notifications",
    "header.account": "User account",
    "header.logout": "Log out",
    "header.openMenu": "Open menu",
  },
};
