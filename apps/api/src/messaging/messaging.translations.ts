export type MessagingLocale = "fr" | "en";

type TranslationDict = Record<string, string>;

const fr: TranslationDict = {
  "messaging.errors.missingImageFile": "Fichier image manquant.",
  "messaging.errors.invalidSubject": "Objet invalide.",
  "messaging.errors.invalidBody": "Corps du message invalide.",
  "messaging.errors.invalidRecipientUserIds":
    "Liste de destinataires invalide.",
  "messaging.errors.invalidIsDraft": "Valeur isDraft invalide.",
  "messaging.errors.messageNotFound": "Message introuvable.",
  "messaging.errors.accessDenied": "Acces au message refuse.",
  "messaging.errors.recipientRequired": "Au moins un destinataire est requis.",
  "messaging.errors.draftNotFound": "Brouillon introuvable.",
  "messaging.errors.noFieldsToUpdate": "Aucun champ a mettre a jour.",
  "messaging.errors.recipientsNotInSchool":
    "Certains destinataires ne sont pas membres de l'ecole.",
  "messaging.errors.insufficientRole": "Role insuffisant.",
  "messaging.errors.invalidForwardAttachmentIds":
    "Liste de pieces jointes a transferer invalide.",
  "messaging.errors.forwardAttachmentNotFound":
    "Une piece jointe a transferer est introuvable ou inaccessible.",
};

const en: TranslationDict = {
  "messaging.errors.missingImageFile": "Missing image file.",
  "messaging.errors.invalidSubject": "Invalid subject.",
  "messaging.errors.invalidBody": "Invalid body.",
  "messaging.errors.invalidRecipientUserIds": "Invalid recipientUserIds.",
  "messaging.errors.invalidIsDraft": "Invalid isDraft.",
  "messaging.errors.messageNotFound": "Message not found.",
  "messaging.errors.accessDenied": "Message access denied.",
  "messaging.errors.recipientRequired": "At least one recipient is required.",
  "messaging.errors.draftNotFound": "Draft not found.",
  "messaging.errors.noFieldsToUpdate": "No fields to update.",
  "messaging.errors.recipientsNotInSchool":
    "Some recipients are not members of the school.",
  "messaging.errors.insufficientRole": "Insufficient role.",
  "messaging.errors.invalidForwardAttachmentIds":
    "Invalid list of attachments to forward.",
  "messaging.errors.forwardAttachmentNotFound":
    "A forwarded attachment could not be found or accessed.",
};

const translations: Record<MessagingLocale, TranslationDict> = {
  fr,
  en,
};

export function translateMessagingError(
  locale: MessagingLocale,
  key: string,
  params?: Record<string, string>,
): string {
  const dict = translations[locale] ?? translations.fr;
  let value = dict[key] ?? translations.fr[key] ?? key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(`{${paramKey}}`, paramValue);
    }
  }

  return value;
}

export function messagingLocaleFromUser(user: {
  preferredLocale?: "FR" | "EN";
}): MessagingLocale {
  return user.preferredLocale === "EN" ? "en" : "fr";
}
