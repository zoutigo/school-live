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
    "common.requiredFieldsHint":
      "Vous devez remplir correctement les champs obligatoires.",
    "common.passwordHint.title":
      "8 caracteres minimum, dont au moins 1 Maj, 1 Min, 1 Chiffre",
    "common.passwordHint.minLength": "8 caracteres minimum",
    "common.passwordHint.uppercase": "Au moins 1 majuscule",
    "common.passwordHint.lowercase": "Au moins 1 minuscule",
    "common.passwordHint.digit": "Au moins 1 chiffre",

    "settings.title": "Parametres",
    "settings.subtitle": "Preferences de navigation",
    "settings.tab.navigation": "Navigation",
    "settings.tab.help": "Aide",
    "settings.tab.staff": "Personnel",
    "settings.tab.language": "Langue",
    "settings.language.title": "Langue de ce navigateur",
    "settings.language.subtitle": "Choisissez la langue de l'interface",
    "settings.language.hint":
      "La langue choisie est appliquee immediatement et conservee sur ce navigateur.",
    "settings.language.fr": "Francais",
    "settings.language.en": "Anglais",

    "settings.accountLanguage.title": "Langue du compte",
    "settings.accountLanguage.subtitle":
      "Cette langue est associee a votre compte",
    "settings.accountLanguage.hint":
      "Elle s'applique automatiquement a chaque connexion, sur n'importe quel appareil.",
    "settings.accountLanguage.success":
      "La langue de votre compte a ete enregistree.",
    "settings.accountLanguage.error":
      "La langue du compte n'a pas pu etre mise a jour.",

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

    "recoveryShell.subtitle": "Portail recuperation",

    "landing.hero.title": "Acces Scolive",
    "landing.hero.subtitle":
      "Connectez-vous avec la methode fournie par votre ecole.",
    "landing.mobileApp.title": "Application mobile Scolive",
    "landing.mobileApp.subtitle": "Disponible sur iOS et Android",
    "landing.mobileApp.description":
      "Restez connecte a la vie scolaire de votre etablissement depuis votre mobile.",
    "landing.mobileApp.appStore": "Telecharger sur App Store",
    "landing.mobileApp.androidApk": "Telecharger l'APK Android",
    "landing.platform.title": "Une plateforme pensee pour les ecoles",
    "landing.platform.subtitle":
      "Un environnement scolaire moderne et connecte",
    "landing.platform.imageAlt": "Eleves africains dans une ecole moderne",
    "landing.platform.description":
      "Scolive valorise la reussite des apprenants avec des outils numeriques clairs, accessibles et adaptes au quotidien scolaire.",
    "landing.features.notes.title": "Suivi des notes",
    "landing.features.notes.description":
      "Consultez resultats, moyennes et progression en temps reel.",
    "landing.features.messaging.title": "Messagerie centralisee",
    "landing.features.messaging.description":
      "Echanges familles, eleves et equipe pedagogique en un seul endroit.",
    "landing.features.payments.title": "Paiements simplifies",
    "landing.features.payments.description":
      "Reglez cantine, sorties et frais scolaires en ligne.",
    "landing.features.schoolLife.title": "Vie scolaire",
    "landing.features.schoolLife.description":
      "Absences, emploi du temps, documents et informations utiles.",
    "landing.features.cardFooter":
      "Scolive centralise vos interactions ecole-famille.",

    "login.languageSwitcher.ariaLabel": "Langue de ce navigateur",
    "login.switchMethod": "Se connecter autrement",
    "login.method.phone": "Telephone + PIN",
    "login.method.email": "Email + Mot de passe",
    "login.method.username": "Identifiant + Mot de passe",
    "login.method.sso": "Google / Apple",
    "login.phone.subtitle": "Connexion rapide",
    "login.phone.fieldPhone": "Telephone",
    "login.phone.fieldPin": "PIN",
    "login.phone.submit": "Connexion telephone + PIN",
    "login.phone.submitLoading": "Connexion PIN...",
    "login.phone.forgotPin": "PIN perdu ?",
    "login.email.subtitle": "Connexion classique",
    "login.email.fieldEmail": "Email",
    "login.email.submit": "Se connecter",
    "login.email.submitLoading": "Connexion...",
    "login.common.password": "Mot de passe",
    "login.common.forgotPassword": "Mot de passe oublie ?",
    "login.username.subtitle": "Connexion par identifiant",
    "login.username.fieldUsername": "Identifiant",
    "login.username.passwordAriaLabel": "Mot de passe (identifiant)",
    "login.username.submit": "Se connecter (identifiant)",
    "login.username.submitLoading": "Connexion...",
    "login.sso.subtitle": "SSO ecole",
    "login.errors.invalidPhone": "Numero invalide (9 chiffres attendus).",
    "login.errors.invalidPin": "PIN invalide (6 chiffres attendus).",
    "login.errors.invalidEmail": "Adresse email invalide.",
    "login.errors.passwordRequired": "Mot de passe requis.",
    "login.errors.invalidUsername":
      "Identifiant invalide (3 caracteres minimum).",
    "login.errors.invalidSession": "Session invalide apres connexion",
    "login.errors.noSchool": "Aucune ecole associee a ce compte",
    "login.errors.connectionError": "Erreur de connexion",
    "login.errors.invalidPhonePin": "Telephone ou PIN invalide",
    "login.errors.invalidEmailPassword": "Email ou mot de passe invalide",
    "login.errors.invalidUsernamePassword":
      "Identifiant ou mot de passe invalide",

    "onboarding.errors.loadOptionsFailed":
      "Impossible de charger les options d'activation.",
    "onboarding.errors.connectionError": "Erreur de connexion.",
    "onboarding.errors.passwordChangeFailed":
      "Changement de mot de passe impossible.",
    "onboarding.errors.activationFailed": "Activation impossible.",
    "onboarding.errors.networkError": "Erreur reseau.",
    "onboarding.errors.invalidLinkMissingEmail":
      "Lien invalide: email manquant.",
    "onboarding.errors.temporaryPasswordRequired":
      "Le mot de passe provisoire est obligatoire.",
    "onboarding.errors.passwordMinLength":
      "Le mot de passe doit faire au moins 8 caracteres.",
    "onboarding.errors.passwordComplexity":
      "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
    "onboarding.errors.confirmPasswordRequired": "Confirmez le mot de passe.",
    "onboarding.errors.passwordConfirmMismatch":
      "La confirmation ne correspond pas au nouveau mot de passe.",
    "onboarding.errors.invalidUsername": "Identifiant invalide.",
    "onboarding.errors.invalidEmail": "Adresse email invalide.",
    "onboarding.errors.missingSetupToken": "Jeton d onboarding manquant.",
    "onboarding.errors.firstNameRequired": "Le prenom est obligatoire.",
    "onboarding.errors.lastNameRequired": "Le nom est obligatoire.",
    "onboarding.errors.genderRequired": "Le genre est obligatoire.",
    "onboarding.errors.birthDateRequired":
      "La date de naissance est obligatoire.",
    "onboarding.errors.invalidDateFormat":
      "Format de date invalide (aaaa-mm-jj).",
    "onboarding.errors.birthDateInFuture":
      "La date de naissance ne peut pas etre dans le futur.",
    "onboarding.errors.newPinDigits":
      "Le nouveau PIN doit contenir 6 chiffres.",
    "onboarding.errors.confirmPinRequired": "Confirmez le nouveau PIN.",
    "onboarding.errors.pinConfirmMismatch":
      "La confirmation ne correspond pas au nouveau PIN.",
    "onboarding.errors.chooseThreeQuestions":
      "Choisissez exactement 3 questions.",
    "onboarding.errors.questionsMustDiffer":
      "Les 3 questions doivent etre differentes.",
    "onboarding.errors.answerMinLength":
      "Chaque reponse doit contenir au moins 2 caracteres.",
    "onboarding.errors.parentClassRequired":
      "La classe de votre enfant est obligatoire.",
    "onboarding.errors.parentStudentRequired":
      "Le nom de votre enfant est obligatoire.",

    "onboarding.shell.title": "Activation de compte",
    "onboarding.success.title": "Enregistrement termine",
    "onboarding.success.description":
      "Votre compte a bien ete configure. Vous serez redirige vers l ecran de connexion pour vous connecter en toute securite.",
    "onboarding.hero.badge": "Onboarding securise",
    "onboarding.hero.title": "Activez votre compte en une seule sequence",
    "onboarding.hero.description":
      "Renseignez les informations d'activation, votre profil et vos questions de recuperation. A la fin, vous retournez directement a la connexion.",
    "onboarding.hero.step1Token": "Etape 1: email optionnel.",
    "onboarding.hero.step1Password":
      "Etape 1: mot de passe provisoire et nouveau mot de passe.",
    "onboarding.hero.step2":
      "Etape 2: informations personnelles (nom, prenom, genre, date de naissance).",
    "onboarding.hero.step3Token": "Etape 3: changement du PIN de connexion.",
    "onboarding.hero.step3Recovery":
      "Etape 3: questions de recuperation puis validation finale.",
    "onboarding.hero.step4":
      "Etape 4: questions de recuperation puis validation finale.",
    "onboarding.hero.imageAlt": "Scene de classe",
    "onboarding.form.title": "Finaliser l'activation",
    "onboarding.form.stepLabel": "Etape",
    "onboarding.form.accountLabel": "Compte concerne",
    "onboarding.form.accountPending": "Compte en attente",
    "onboarding.form.emailOptional": "Email (optionnel)",
    "onboarding.form.emailOptionalHint":
      "Vous pouvez continuer sans email et le renseigner plus tard dans votre compte.",
    "onboarding.form.usernameLabel": "Identifiant:",
    "onboarding.form.temporaryPassword": "Mot de passe provisoire",
    "onboarding.form.newPassword": "Nouveau mot de passe",
    "onboarding.form.confirmation": "Confirmation",
    "onboarding.form.firstName": "Votre prenom",
    "onboarding.form.lastName": "Votre nom",
    "onboarding.form.gender": "Votre genre",
    "onboarding.form.select": "Selectionner",
    "onboarding.form.male": "Masculin",
    "onboarding.form.female": "Feminin",
    "onboarding.form.otherGender": "Autre",
    "onboarding.form.birthDate": "Votre date de naissance",
    "onboarding.form.pinSectionTitle": "Modifiez votre PIN de connexion",
    "onboarding.form.newPin": "Nouveau PIN",
    "onboarding.form.confirmPin": "Confirmer PIN",
    "onboarding.form.chooseQuestions": "Choisissez 3 questions de recuperation",
    "onboarding.form.yourAnswer": "Votre reponse",
    "onboarding.form.childClass": "Classe de votre enfant",
    "onboarding.form.selectClass": "Selectionner une classe",
    "onboarding.form.childName": "Nom de l'enfant",
    "onboarding.form.selectStudent": "Selectionner un eleve",
    "onboarding.form.loadingOptions": "Chargement des options...",
    "onboarding.form.continue": "Continuer",
    "onboarding.form.submitting": "Validation...",
    "onboarding.form.submit": "Finaliser l'activation",

    "recovery.password.shell.title": "Recuperation de mot de passe",
    "recovery.password.cardTitle": "Mot de passe oublie",
    "recovery.password.step1": "Etape 1/3: demande de lien",
    "recovery.password.step2": "Etape 2/3: verification",
    "recovery.password.step3": "Etape 3/3: nouveau mot de passe",
    "recovery.password.fields.email": "Email du compte",
    "recovery.password.fields.birthDate": "Date de naissance",
    "recovery.password.fields.newPassword": "Nouveau mot de passe",
    "recovery.password.fields.confirmation": "Confirmation",
    "recovery.password.submit.sending": "Envoi en cours...",
    "recovery.password.submit.send": "Envoyer le lien",
    "recovery.password.submit.verifying": "Verification...",
    "recovery.password.submit.verify": "Verifier mon identite",
    "recovery.password.submit.resetting": "Reinitialisation...",
    "recovery.password.submit.reset": "Reinitialiser mon mot de passe",
    "recovery.password.loadingLink": "Chargement du lien...",
    "recovery.password.loading": "Chargement...",
    "recovery.password.accountDetected": "Compte detecte:",
    "recovery.password.linkInvalid":
      "Ce lien n'est plus valide. Demandez un nouveau lien de reinitialisation.",
    "recovery.password.newRequest": "Nouvelle demande",
    "recovery.password.backToLogin": "Retour a la connexion",
    "recovery.password.errors.invalidEmail": "Adresse email invalide.",
    "recovery.password.errors.invalidLink": "Lien invalide.",
    "recovery.password.errors.birthDateRequired":
      "La date de naissance est obligatoire.",
    "recovery.password.errors.answerRequiredPrefix": "Reponse obligatoire",
    "recovery.password.errors.passwordMinLength":
      "Le mot de passe doit faire au moins 8 caracteres.",
    "recovery.password.errors.passwordComplexity":
      "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
    "recovery.password.errors.confirmPasswordRequired":
      "Confirmez le mot de passe.",
    "recovery.password.errors.passwordConfirmMismatch":
      "La confirmation ne correspond pas au nouveau mot de passe.",
    "recovery.password.errors.invalidOrExpiredLink":
      "Lien de reinitialisation invalide ou expire.",
    "recovery.password.errors.networkError": "Erreur reseau.",
    "recovery.password.errors.requestFailed":
      "Demande impossible. Veuillez reessayer.",
    "recovery.password.errors.invalidRecoveryInfo":
      "Informations de recuperation invalides.",
    "recovery.password.errors.resetFailed": "Reinitialisation impossible.",
    "recovery.password.success.requestSentDefault":
      "Si ce compte existe, un lien de reinitialisation a ete envoye.",
    "recovery.password.success.verified":
      "Verification validee. Definissez votre nouveau mot de passe.",
    "recovery.password.toast.requestSent.title": "Demande envoyee",
    "recovery.password.toast.requestSent.description":
      "Si ce compte existe, la demande de reinitialisation a bien ete prise en compte. Vous allez etre redirige vers la connexion.",
    "recovery.password.toast.passwordReset.title": "Mot de passe reinitialise",
    "recovery.password.toast.passwordReset.description":
      "Votre nouveau mot de passe a bien ete enregistre. Vous allez etre redirige vers la connexion.",

    "recovery.username.shell.title": "Recuperation par identifiant",
    "recovery.username.cardTitle": "Mot de passe oublie (identifiant)",
    "recovery.username.step1": "Etape 1/3: saisir votre identifiant",
    "recovery.username.fields.username": "Identifiant",
    "recovery.username.usernamePlaceholder": "PrenomNOM",
    "recovery.username.identifierLabel": "Identifiant:",
    "recovery.username.submit.searching": "Recherche...",
    "recovery.username.submit.continue": "Continuer",
    "recovery.username.noQuestionsConfigured":
      "Aucune question de recuperation n'est configuree pour ce compte. Contactez votre administration scolaire.",
    "recovery.username.loading": "Chargement...",
    "recovery.username.errors.usernameInvalid":
      "Identifiant invalide (3 caracteres minimum).",
    "recovery.username.errors.usernameNotFound": "Identifiant introuvable.",
    "recovery.pin.shell.title": "Recuperation de PIN",
    "recovery.pin.cardTitle": "PIN perdu",
    "recovery.pin.cardSubtitle":
      "Recuperez l acces avec vos questions de securite",
    "recovery.pin.fields.emailOptional": "Email (optionnel)",
    "recovery.pin.fields.phoneOptional": "Telephone (optionnel)",
    "recovery.pin.emailPlaceholder": "prenom.nom@gmail.com",
    "recovery.pin.phonePlaceholder": "6XXXXXXXX",
    "recovery.pin.pinPlaceholder": "123456",
    "recovery.pin.submit.loadingOptions": "Chargement...",
    "recovery.pin.submit.continueToQuestions":
      "Continuer vers les questions de recuperation",
    "recovery.pin.submit.verifying": "Verification...",
    "recovery.pin.submit.verify": "Verifier mes reponses",
    "recovery.pin.fields.newPin": "Nouveau PIN (6 chiffres)",
    "recovery.pin.fields.confirmPin": "Confirmer le PIN",
    "recovery.pin.submit.resetting": "Reinitialisation...",
    "recovery.pin.submit.reset": "Definir mon nouveau PIN",
    "recovery.pin.success.verified":
      "Verification reussie. Vous pouvez definir un nouveau PIN.",
    "recovery.pin.errors.loadOptionsFailed":
      "Impossible de charger les questions de recuperation.",
    "recovery.pin.errors.questionsNotLoaded":
      "Chargez d abord les questions de recuperation.",
    "recovery.pin.errors.resetFailed": "Reinitialisation du PIN impossible.",
    "recovery.pin.errors.emailOrPhoneRequired":
      "Renseignez un email ou un telephone.",
    "recovery.pin.errors.invalidPhone":
      "Numero invalide (9 chiffres attendus).",
    "recovery.pin.errors.invalidSession": "Session de recuperation invalide.",
    "recovery.pin.errors.pinFormat":
      "Le PIN doit contenir exactement 6 chiffres.",
    "recovery.pin.errors.confirmPinRequired": "Confirmez le PIN.",
    "recovery.pin.errors.pinConfirmMismatch":
      "La confirmation ne correspond pas au PIN.",
    "recovery.pin.toast.title": "PIN reinitialise",
    "recovery.pin.toast.description":
      "Votre nouveau PIN a bien ete enregistre. Vous allez etre redirige vers la connexion.",
    "firstPassword.shell.title": "Premiere connexion",
    "firstPassword.success.title": "Mot de passe defini",
    "firstPassword.success.subtitle": "Redirection en cours...",
    "firstPassword.success.message":
      "Votre mot de passe a ete defini avec succes. Vous allez etre redirige vers la connexion.",
    "firstPassword.cardTitle": "Definir mon mot de passe",
    "firstPassword.cardSubtitle":
      "Premiere connexion — choisissez un mot de passe securise",
    "firstPassword.identifierLabel": "Identifiant :",
    "firstPassword.fields.confirmPassword": "Confirmer le mot de passe",
    "firstPassword.submit.saving": "Enregistrement...",
    "firstPassword.submit.submit": "Definir mon mot de passe",
    "firstPassword.errors.changeFailed":
      "Changement de mot de passe impossible.",
    "pendingAccount.cardLeft.title": "Compte en attente",
    "pendingAccount.cardLeft.subtitle":
      "Finalisez l'activation pour acceder aux donnees de votre ecole",
    "pendingAccount.cardLeft.description":
      "Votre compte a bien ete cree, mais il doit etre valide avant de pouvoir consulter vos donnees scolaires.",
    "pendingAccount.info.account": "Compte:",
    "pendingAccount.info.school": "Ecole:",
    "pendingAccount.info.methods": "Methodes:",
    "pendingAccount.info.methodsValue": "Code activation ou PIN initial",
    "pendingAccount.cardRight.title": "Activer le compte",
    "pendingAccount.cardRight.subtitle": "Telephone confirme + nouveau PIN",
    "pendingAccount.fields.email": "Email",
    "pendingAccount.fields.accountPhone": "Telephone du compte",
    "pendingAccount.fields.confirmedPhone": "Telephone confirme",
    "pendingAccount.fields.activationCode": "Code d activation (optionnel)",
    "pendingAccount.fields.initialPin": "PIN initial (optionnel)",
    "pendingAccount.fields.newPin": "Nouveau PIN (6 chiffres)",
    "pendingAccount.placeholders.email": "prenom.nom@gmail.com",
    "pendingAccount.placeholders.phone": "6XXXXXXXX",
    "pendingAccount.placeholders.activationCode": "Ex: A1B2C3D4",
    "pendingAccount.placeholders.initialPin": "PIN temporaire fourni",
    "pendingAccount.placeholders.newPin": "123456",
    "pendingAccount.submit.activating": "Activation...",
    "pendingAccount.submit.activate": "Activer mon compte",
    "pendingAccount.success.activated": "Compte active avec succes.",
    "pendingAccount.errors.activationMethodRequired":
      "Saisissez un code d activation ou votre PIN initial.",
    "pendingAccount.errors.newPinFormat":
      "Le nouveau PIN doit contenir exactement 6 chiffres.",
    "pendingAccount.errors.loadOptionsFailed":
      "Impossible de charger les options d activation",
    "pendingAccount.errors.loadError": "Erreur lors du chargement",
    "pendingAccount.errors.activationFailed":
      "Activation impossible. Verifiez vos informations.",
    "profileSetup.redirecting": "Redirection vers le nouvel onboarding...",
    "authError.title": "Erreur d'authentification",
    "authError.codeLabel": "Code:",
    "authError.hint.noCode":
      "Erreur OAuth sans code explicite. Verifiez AUTH_SECRET/NEXTAUTH_SECRET, AUTH_URL/NEXTAUTH_URL et les providers actifs.",
    "authError.hint.configuration":
      "Configuration NextAuth invalide. Verifiez AUTH_SECRET et les credentials provider.",
    "authError.hint.accessDenied":
      "Acces refuse par le provider ou par les callbacks applicatifs.",
    "authError.hint.oauthHandshake":
      "Echec lors du handshake OAuth. Verifiez AUTH_URL/NEXTAUTH_URL et les redirect URIs.",
    "authError.hint.accountNotLinked":
      "Ce compte provider est deja lie a un autre utilisateur.",
    "authError.hint.default":
      "Consultez les logs serveur [next-auth][error] pour le detail technique.",
    "verifyEmail.noToken.title": "Lien invalide",
    "verifyEmail.noToken.message":
      "Ce lien de verification est incomplet ou malforme.",
    "verifyEmail.success.title": "Email verifie !",
    "verifyEmail.success.followUp":
      "Vous pouvez maintenant utiliser votre adresse email pour vous connecter.",
    "verifyEmail.failure.title": "Echec de la verification",
    "verifyEmail.backToHome": "Retour a l'accueil",
    "verifyEmail.fallback.verified": "Email verifie avec succes.",
    "verifyEmail.fallback.invalidOrExpired": "Lien invalide ou expire.",
    "verifyEmail.fallback.serverError":
      "Impossible de contacter le serveur. Reessayez plus tard.",
    "ssoProfile.shell.title": "Recuperation du profil SSO",
    "ssoProfile.cardTitle": "Completer votre profil",
    "ssoProfile.cardSubtitle":
      "Certaines informations sont requises avant la premiere connexion",
    "ssoProfile.infoBox":
      "Finalisez votre profil SSO pour securiser l acces a votre compte.",
    "ssoProfile.fields.firstName": "Prenom",
    "ssoProfile.fields.lastName": "Nom",
    "ssoProfile.fields.gender": "Genre",
    "ssoProfile.fields.phone": "Telephone",
    "ssoProfile.fields.pin": "PIN (6 chiffres)",
    "ssoProfile.gender.male": "Masculin",
    "ssoProfile.gender.female": "Feminin",
    "ssoProfile.gender.other": "Autre",
    "ssoProfile.missingFieldsPrefix": "Champs manquants detectes",
    "ssoProfile.submit.saving": "Enregistrement...",
    "ssoProfile.submit.submit": "Finaliser mon profil",
    "ssoProfile.errors.firstNameRequired": "Prenom requis.",
    "ssoProfile.errors.lastNameRequired": "Nom requis.",
    "ssoProfile.errors.invalidSession": "Session SSO invalide.",
    "ssoProfile.errors.ssoLoginFailed":
      "Connexion SSO impossible apres completion du profil.",
    "ssoProfile.errors.sessionInvalidAfterLogin":
      "Session invalide apres connexion SSO",
    "ssoProfile.errors.noSchoolLinked": "Aucune ecole associee a ce compte",
    "ssoProfile.errors.incompleteSession": "Session SSO incomplete",
    "ssoProfile.errors.loadProfileFailed":
      "Impossible de charger les informations de profil SSO",
    "ssoProfile.errors.completionFailed": "Completion du profil impossible.",
    "ssoProfile.errors.generic": "Erreur",
    "platformCredentials.cardTitle": "Completer vos identifiants",
    "platformCredentials.cardSubtitle":
      "Pour securiser votre acces, renseignez les informations manquantes.",
    "platformCredentials.accountLabel": "Compte:",
    "platformCredentials.fields.newPassword": "Nouveau mot de passe",
    "platformCredentials.fields.confirmPassword": "Confirmer le mot de passe",
    "platformCredentials.fields.phone": "Telephone",
    "platformCredentials.fields.confirmPhone": "Confirmer le telephone",
    "platformCredentials.fields.newPin": "Nouveau PIN (6 chiffres)",
    "platformCredentials.fields.confirmPin": "Confirmer le PIN",
    "platformCredentials.submit.validating": "Validation...",
    "platformCredentials.submit.validate": "Valider",
    "platformCredentials.errors.invalidSession": "Session invalide.",
    "platformCredentials.errors.confirmPasswordMismatch":
      "La confirmation du mot de passe ne correspond pas.",
    "platformCredentials.errors.confirmPhoneMismatch":
      "La confirmation du telephone ne correspond pas.",
    "platformCredentials.errors.confirmPinMismatch":
      "La confirmation du PIN ne correspond pas.",
    "platformCredentials.errors.configFailed": "Configuration impossible.",

    "common.close": "Fermer",
    "common.edit": "Modifier",
    "common.create": "Creer",
    "common.configure": "Configurer",
    "common.errors.invalidCsrfSession":
      "Session CSRF invalide. Reconnectez-vous.",

    "account.password.title": "Mot de passe",
    "account.password.notConfigured": "Non configure",
    "account.password.closeAriaLabel": "Fermer la section mot de passe",
    "account.password.createAriaLabel": "Creer un mot de passe",
    "account.password.editAriaLabel": "Modifier le mot de passe",
    "account.password.create.intro":
      "Votre compte n'a pas encore de mot de passe. Definissez-en un pour pouvoir vous connecter avec votre email.",
    "account.password.fields.newPassword": "Nouveau mot de passe",
    "account.password.fields.confirmPassword": "Confirmer le mot de passe",
    "account.password.fields.currentPassword": "Ancien mot de passe",
    "account.password.fields.confirmNewPassword":
      "Confirmer le nouveau mot de passe",
    "account.password.create.submit.creating": "Creation...",
    "account.password.create.submit.create": "Creer le mot de passe",
    "account.password.submit.updating": "Mise a jour...",
    "account.password.submit.change": "Changer le mot de passe",
    "account.password.errors.currentRequired":
      "Le mot de passe actuel est obligatoire.",
    "account.password.errors.confirmMismatch":
      "La confirmation du nouveau mot de passe ne correspond pas.",
    "account.password.errors.createFailed":
      "Impossible de creer le mot de passe.",
    "account.password.errors.changeFailed":
      "Changement de mot de passe impossible.",
    "account.password.success.created": "Mot de passe cree avec succes.",
    "account.password.success.updated": "Mot de passe mis a jour avec succes.",

    "account.pin.title": "PIN de connexion",
    "account.pin.notConfigured": "Non configure",
    "account.pin.closeAriaLabel": "Fermer la section PIN",
    "account.pin.configureAriaLabel": "Configurer telephone et PIN",
    "account.pin.editAriaLabel": "Modifier le PIN",
    "account.pin.addPhone.intro":
      "Ajoutez un numero de telephone et un code PIN pour vous connecter depuis le mobile.",
    "account.pin.fields.phone": "Telephone (9 chiffres)",
    "account.pin.fields.pinCode": "Code PIN (6 chiffres)",
    "account.pin.fields.confirmPin": "Confirmer le PIN",
    "account.pin.fields.currentPin": "PIN actuel",
    "account.pin.fields.newPin": "Nouveau PIN (6 chiffres)",
    "account.pin.fields.confirmNewPin": "Confirmation PIN",
    "account.pin.addPhone.submit.configuring": "Configuration...",
    "account.pin.submit.updating": "Mise a jour PIN...",
    "account.pin.submit.change": "Changer le PIN",
    "account.pin.errors.currentFormat":
      "Le PIN actuel doit contenir 6 chiffres.",
    "account.pin.errors.newFormat": "Le nouveau PIN doit contenir 6 chiffres.",
    "account.pin.errors.confirmMismatch":
      "La confirmation du nouveau PIN ne correspond pas.",
    "account.pin.errors.pinMismatch": "Les PINs ne correspondent pas.",
    "account.pin.errors.addPhoneFailed": "Impossible d'ajouter le telephone.",
    "account.pin.errors.changeFailed": "Changement de PIN impossible.",
    "account.pin.success.configured":
      "Telephone et PIN configures avec succes.",
    "account.pin.success.updated": "PIN mis a jour avec succes.",

    "discipline.types.absence": "Absence",
    "discipline.types.retard": "Retard",
    "discipline.types.sanction": "Sanction",
    "discipline.types.punition": "Punition",

    "discipline.common.yes": "Oui",
    "discipline.common.no": "Non",
    "discipline.common.loading": "Chargement...",
    "discipline.common.cancel": "Annuler",
    "discipline.common.delete": "Supprimer",
    "discipline.common.networkError": "Erreur reseau.",
    "discipline.common.csrfInvalid": "Session CSRF invalide. Reconnectez-vous.",

    "discipline.list.columns.type": "Type",
    "discipline.list.columns.date": "Date",
    "discipline.list.columns.reason": "Motif",
    "discipline.list.columns.duration": "Duree",
    "discipline.list.columns.justified": "Justifie",
    "discipline.list.columns.author": "Auteur",
    "discipline.list.columns.actions": "Actions",
    "discipline.list.editAria": "Modifier l'evenement",
    "discipline.list.deleteAria": "Supprimer l'evenement",
    "discipline.list.durationPrefix": "Duree :",
    "discipline.list.justifiedPrefix": "Justifie :",
    "discipline.list.authorPrefix": "Auteur :",

    "discipline.page.defaultClassName": "Classe",
    "discipline.page.subtitle": "Absences, retards, sanctions et punitions",
    "discipline.page.tabs.entry": "Saisie",
    "discipline.page.tabs.history": "Historique",
    "discipline.page.tabs.help": "Aide",
    "discipline.page.classNotAccessible":
      "Classe non accessible avec vos affectations.",
    "discipline.page.studentLabel": "Eleve",

    "discipline.help.summary":
      "ce module permet a l'enseignant de declarer des absences, retards, sanctions et punitions sur ses classes affectees.",
    "discipline.help.record.name": "Saisir",
    "discipline.help.record.purpose":
      "enregistrer rapidement un evenement de vie scolaire.",
    "discipline.help.record.howTo":
      "selectionner l'eleve puis renseigner type, date et motif.",
    "discipline.help.record.moduleImpact":
      "l'evenement est visible au parent sur Vie scolaire (annee en cours).",
    "discipline.help.record.crossModuleImpact":
      "alimente ensuite la page Cursus pour l'historique global.",
    "discipline.help.verify.name": "Verifier",
    "discipline.help.verify.purpose":
      "consulter le journal discipline de l'eleve.",
    "discipline.help.verify.howTo":
      "ouvrir Historique pour voir les evenements existants.",
    "discipline.help.verify.moduleImpact": "evite les doublons de saisie.",
    "discipline.help.verify.crossModuleImpact":
      "facilite la coordination avec SCHOOL_MANAGER/SUPERVISOR.",

    "discipline.errors.loadClass": "Impossible de charger la classe.",
    "discipline.errors.loadHistory":
      "Impossible de charger l'historique discipline.",
    "discipline.errors.createFailed": "Creation impossible.",
    "discipline.errors.editFailed": "Modification impossible.",
    "discipline.errors.deleteFailed": "Suppression impossible.",
    "discipline.success.eventCreated": "Evenement discipline enregistre.",
    "discipline.success.eventUpdated": "Evenement modifie.",
    "discipline.success.eventDeleted": "Evenement supprime.",

    "discipline.validation.dateRequired": "La date est obligatoire.",
    "discipline.validation.reasonRequired": "Le motif est obligatoire.",
    "discipline.validation.durationPositive":
      "La duree doit etre un entier positif.",

    "discipline.form.type": "Type d'evenement",
    "discipline.form.typeEditAria": "Type d'evenement edition",
    "discipline.form.dateTime": "Date et heure",
    "discipline.form.dateTimeEditAria": "Date et heure edition",
    "discipline.form.reason": "Motif",
    "discipline.form.reasonEditAria": "Motif edition",
    "discipline.form.reasonPlaceholder":
      "Ex: travail non rendu, absence non justifiee",
    "discipline.form.duration": "Duree (minutes, optionnel)",
    "discipline.form.durationEditAria": "Duree edition (minutes, optionnel)",
    "discipline.form.comment": "Commentaire (optionnel)",
    "discipline.form.commentEditAria": "Commentaire edition (optionnel)",
    "discipline.form.justified": "Justifie (absence / retard)",
    "discipline.form.saving": "Enregistrement...",
    "discipline.form.submitCreate": "Enregistrer l'evenement",
    "discipline.form.submitUpdate": "Enregistrer les modifications",
    "discipline.form.submitReport": "Signaler",
    "discipline.form.cancel": "Annuler",

    "discipline.eleves.sectionTitle":
      "Vie scolaire : absences, retards, sanctions et punitions",

    "discipline.empty.studentEvents": "Aucun evenement pour cet eleve.",
    "discipline.empty.eleves": "Aucun evenement de vie scolaire.",

    "discipline.delete.title": "Supprimer cet evenement ?",
    "discipline.delete.message":
      'Cette action est irreversible. L\'evenement "{label}" sera supprime definitivement.',
    "discipline.delete.confirm": "Supprimer",

    "discipline.vieScolaire.title": "Vie scolaire",
    "discipline.vieScolaire.subtitleDefault": "Suivi eleve",
    "discipline.vieScolaire.eventsWarning":
      "Les evenements vie scolaire sont temporairement indisponibles. Affichage des donnees de demonstration.",
    "discipline.vieScolaire.error": "Impossible de charger la vie scolaire.",
    "discipline.vieScolaire.tabs.synthese": "Synthese",
    "discipline.vieScolaire.tabs.absencesRetards": "Absences / retards",
    "discipline.vieScolaire.tabs.sanctionsPunitions": "Sanctions / punitions",
    "discipline.vieScolaire.kpi.absences": "Absences",
    "discipline.vieScolaire.kpi.retards": "Retards",
    "discipline.vieScolaire.kpi.sanctions": "Sanctions",
    "discipline.vieScolaire.kpi.punitions": "Punitions",
    "discipline.vieScolaire.synthese.lastAbsence": "Derniere absence",
    "discipline.vieScolaire.synthese.lastRetard": "Dernier retard",
    "discipline.vieScolaire.synthese.lastSanction": "Derniere sanction",
    "discipline.vieScolaire.synthese.lastPunition": "Derniere punition",
    "discipline.vieScolaire.synthese.noData": "Aucune donnee",
    "discipline.vieScolaire.absences.columns.event": "Absence / retard",
    "discipline.vieScolaire.absences.columns.type": "Type",
    "discipline.vieScolaire.absences.columns.duration": "Duree",
    "discipline.vieScolaire.absences.columns.justified": "Justifie ?",
    "discipline.vieScolaire.absences.columns.reason": "Motif",
    "discipline.vieScolaire.absences.columns.comment": "Commentaire",
    "discipline.vieScolaire.absences.empty":
      "Aucun evenement sur l'annee active.",
    "discipline.vieScolaire.absences.durationPrefix": "Duree:",
    "discipline.vieScolaire.absences.justifiedPrefix": "Justifie:",
    "discipline.vieScolaire.absences.reasonPrefix": "Motif:",
    "discipline.vieScolaire.absences.commentPrefix": "Commentaire:",
    "discipline.vieScolaire.sanctions.columns.type": "Type",
    "discipline.vieScolaire.sanctions.columns.incident": "Incident",
    "discipline.vieScolaire.sanctions.columns.date": "Date",
    "discipline.vieScolaire.sanctions.columns.reason": "Motif",
    "discipline.vieScolaire.sanctions.columns.by": "Par",
    "discipline.vieScolaire.sanctions.columns.comment": "Commentaire",
    "discipline.vieScolaire.sanctions.columns.executionDate":
      "Date de deroulement",
    "discipline.vieScolaire.sanctions.empty":
      "Aucune sanction/punition sur l'annee active.",
    "discipline.vieScolaire.sanctions.datePrefix": "Date:",
    "discipline.vieScolaire.sanctions.reasonPrefix": "Motif:",
    "discipline.vieScolaire.sanctions.byPrefix": "Par:",
    "discipline.vieScolaire.sanctions.commentPrefix": "Commentaire:",
    "discipline.vieScolaire.sanctions.executionDatePrefix":
      "Date de deroulement:",
    "discipline.vieScolaire.equipePedagogique": "Equipe pedagogique",

    "discipline.accueil.summaryHint.none": "Aucun point de vigilance",
    "discipline.accueil.summaryHint.unjustified":
      "{count} absence(s) non justifiee(s)",
    "discipline.accueil.summaryHint.sanctions":
      "{count} sanction(s) ou punition(s)",
    "discipline.accueil.panel.action": "Voir la synthese",
    "discipline.accueil.panel.noRecentEvent":
      "Aucun evenement vie scolaire recent.",
    "discipline.accueil.metrics.unjustifiedAbsences": "Absences non justifiees",
    "discipline.accueil.metrics.sanctionsPunitions": "Sanctions / punitions",
    "discipline.accueil.quickAccess.hint": "Absences, retards, sanctions",

    "discipline.sidebar.vieScolaire": "Vie scolaire",
    "discipline.sidebar.discipline": "Discipline",

    "discipline.cursus.title": "Cursus",
    "discipline.cursus.subtitleDefault": "Historique eleve",
    "discipline.cursus.error": "Impossible de charger le cursus.",
    "discipline.cursus.tabs.synthese": "Synthese",
    "discipline.cursus.tabs.vieScolaire": "Vie scolaire",
    "discipline.cursus.tabs.help": "Aide",
    "discipline.cursus.filters.year": "Annee",
    "discipline.cursus.filters.class": "Classe",
    "discipline.cursus.filters.type": "Type",
    "discipline.cursus.filters.allFeminine": "Toutes",
    "discipline.cursus.filters.allMasculine": "Tous",
    "discipline.cursus.filters.reset": "Reinitialiser",
    "discipline.cursus.filters.exportPdf": "Exporter PDF",
    "discipline.cursus.notDefined.year": "Annee non definie",
    "discipline.cursus.notDefined.class": "Classe non definie",
    "discipline.cursus.synthese.yearsClasses": "Annees / classes",
    "discipline.cursus.empty":
      "Aucun evenement vie scolaire sur le cursus pour le moment.",
    "discipline.cursus.help.moduleName": "Cursus",
    "discipline.cursus.help.summary":
      "ce module recapitulera le parcours eleve annee par annee et classe par classe.",
    "discipline.cursus.help.actionName": "Consulter",
    "discipline.cursus.help.actionPurpose":
      "analyser l'historique global de l'eleve.",
    "discipline.cursus.help.actionHowTo":
      "ouvrir l'onglet Vie scolaire pour un recap par annee/classe.",
    "discipline.cursus.help.actionModuleImpact":
      "vue chronologique des evenements du parcours.",
    "discipline.cursus.help.actionCrossModuleImpact":
      "complete la page Vie scolaire courante qui ne montre que l'annee active.",

    "discipline.dashboard.cardTitle": "Vie scolaire",
    "discipline.dashboard.cardEyebrow": "Discipline",
    "discipline.dashboard.empty":
      "Aucun enfant associe ou aucune donnee de vie scolaire disponible.",
    "discipline.dashboard.stats.absences": "Absences",
    "discipline.dashboard.stats.retards": "Retards",
    "discipline.dashboard.stats.incidents": "Incidents",
    "discipline.dashboard.openDetail": "Ouvrir le detail discipline",
    "discipline.dashboard.status.calm": "Situation sereine",
    "discipline.dashboard.status.watch": "A surveiller",
    "discipline.dashboard.status.alert": "Priorite parent",
    "discipline.dashboard.detail.none":
      "Aucun signal disciplinaire notable sur la periode.",
    "discipline.dashboard.detail.unjustifiedAbsences":
      "{count} absence(s) a justifier.",
    "discipline.dashboard.detail.incidentsRecorded":
      "{count} incident(s) recense(s) sur la periode.",
    "discipline.dashboard.detail.absencesRecorded":
      "{count} absence(s) enregistree(s).",
    "discipline.dashboard.detail.retardsThisTerm":
      "{count} retard(s) ce trimestre.",

    "discipline.mail.subjectCreated":
      "Scolive - Evenement vie scolaire enregistre",
    "discipline.mail.subjectUpdated":
      "Scolive - Evenement vie scolaire mis a jour",
    "discipline.mail.actionCreated": "enregistre",
    "discipline.mail.actionUpdated": "mis a jour",
    "discipline.mail.greeting": "Bonjour {firstName},",
    "discipline.mail.intro":
      "Un evenement de vie scolaire a ete {action} pour {studentFullName}.",
    "discipline.mail.type": "Type",
    "discipline.mail.reason": "Motif",
    "discipline.mail.date": "Date",
    "discipline.mail.class": "Classe",
    "discipline.mail.author": "Saisi par",
    "discipline.mail.openPortal": "Ouvrir le portail",
    "discipline.mail.consultPortal": "Consulter le portail",

    "homework.page.title": "Devoirs",
    "homework.page.defaultClassName": "Classe",
    "homework.page.subtitle": "Suivi des devoirs et etat de rendu",
    "homework.page.classNotAccessible":
      "Classe non accessible avec vos affectations.",

    "homework.tabs.list": "Liste",
    "homework.tabs.view": "Voir",
    "homework.tabs.help": "Aide",

    "homework.status.todo": "A faire",
    "homework.status.late": "En retard",
    "homework.status.done": "Valide",

    "homework.table.title": "Titre",
    "homework.table.subject": "Matiere",
    "homework.table.dueDate": "Echeance",
    "homework.table.status": "Statut",

    "homework.common.loading": "Chargement...",
    "homework.errors.loadFailed":
      "Impossible de charger les devoirs de classe.",
    "homework.errors.networkError": "Erreur reseau.",

    "homework.help.summary":
      "ce module centralise les devoirs annonces a la classe et leur statut de suivi.",
    "homework.help.list.name": "Lister",
    "homework.help.list.purpose": "suivre les devoirs en cours.",
    "homework.help.list.howTo": "consulter l'onglet Liste.",
    "homework.help.list.moduleImpact":
      "permet de gerer la charge eleve par eleve.",
    "homework.help.list.crossModuleImpact":
      "en lien avec Notes pour evaluer les rendus.",
    "homework.help.view.name": "Voir",
    "homework.help.view.purpose": "obtenir une synthese rapide de la classe.",
    "homework.help.view.howTo": "ouvrir l'onglet Voir.",
    "homework.help.view.moduleImpact": "priorisation des relances.",
    "homework.help.view.crossModuleImpact":
      "ameliore le suivi parent via les espaces enfant.",

    "homework.summary.class": "Classe",
    "homework.summary.total": "Devoirs",
    "homework.summary.todo": "A faire",
    "homework.summary.late": "En retard",

    "homework.sidebar.devoirs": "Devoirs",
    "homework.sidebar.cahierDeTexte": "Cahier de texte",

    "homework.dashboard.title": "Devoirs en cours",
    "homework.dashboard.noHomework": "Aucun devoir en cours",
    "homework.dashboard.viewAll": "Voir tout",

    "homework.cahierDeTexte.title": "Cahier de texte",
    "homework.cahierDeTexte.subtitle": "Travail a faire",
    "homework.cahierDeTexte.summary":
      "Consultez les devoirs et consignes de travail de votre enfant.",
    "homework.cahierDeTexte.bullet1": "Devoirs du jour et travaux a rendre.",
    "homework.cahierDeTexte.bullet2":
      "Consignes partagees par les enseignants.",
    "homework.cahierDeTexte.bullet3":
      "Preparation de la semaine avec votre enfant.",
  },
  en: {
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.back": "Back",
    "common.loading": "Loading...",
    "common.apply": "Apply",
    "common.requiredFieldsHint": "Required fields must be filled in correctly.",
    "common.passwordHint.title":
      "8 characters minimum, including at least 1 uppercase, 1 lowercase, 1 digit",
    "common.passwordHint.minLength": "8 characters minimum",
    "common.passwordHint.uppercase": "At least 1 uppercase letter",
    "common.passwordHint.lowercase": "At least 1 lowercase letter",
    "common.passwordHint.digit": "At least 1 digit",

    "settings.title": "Settings",
    "settings.subtitle": "Navigation preferences",
    "settings.tab.navigation": "Navigation",
    "settings.tab.help": "Help",
    "settings.tab.staff": "Staff",
    "settings.tab.language": "Language",
    "settings.language.title": "Language of this browser",
    "settings.language.subtitle": "Choose the interface language",
    "settings.language.hint":
      "The selected language is applied immediately and saved on this browser.",
    "settings.language.fr": "French",
    "settings.language.en": "English",

    "settings.accountLanguage.title": "Account language",
    "settings.accountLanguage.subtitle":
      "This language is tied to your account",
    "settings.accountLanguage.hint":
      "It is applied automatically on every login, on any device.",
    "settings.accountLanguage.success": "Your account language has been saved.",
    "settings.accountLanguage.error":
      "The account language could not be updated.",

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

    "recoveryShell.subtitle": "Recovery portal",

    "landing.hero.title": "Scolive Access",
    "landing.hero.subtitle":
      "Sign in using the method provided by your school.",
    "landing.mobileApp.title": "Scolive mobile app",
    "landing.mobileApp.subtitle": "Available on iOS and Android",
    "landing.mobileApp.description":
      "Stay connected to your school's life from your mobile.",
    "landing.mobileApp.appStore": "Download on the App Store",
    "landing.mobileApp.androidApk": "Download the Android APK",
    "landing.platform.title": "A platform designed for schools",
    "landing.platform.subtitle": "A modern, connected school environment",
    "landing.platform.imageAlt": "African students in a modern school",
    "landing.platform.description":
      "Scolive supports learner success with clear, accessible digital tools suited to everyday school life.",
    "landing.features.notes.title": "Grade tracking",
    "landing.features.notes.description":
      "View results, averages and progress in real time.",
    "landing.features.messaging.title": "Centralized messaging",
    "landing.features.messaging.description":
      "Exchanges between families, students and teaching staff in one place.",
    "landing.features.payments.title": "Simplified payments",
    "landing.features.payments.description":
      "Pay for the canteen, outings and school fees online.",
    "landing.features.schoolLife.title": "School life",
    "landing.features.schoolLife.description":
      "Absences, timetable, documents and useful information.",
    "landing.features.cardFooter":
      "Scolive centralizes school-family interactions.",

    "login.languageSwitcher.ariaLabel": "Language of this browser",
    "login.switchMethod": "Sign in another way",
    "login.method.phone": "Phone + PIN",
    "login.method.email": "Email + Password",
    "login.method.username": "Username + Password",
    "login.method.sso": "Google / Apple",
    "login.phone.subtitle": "Quick sign-in",
    "login.phone.fieldPhone": "Phone",
    "login.phone.fieldPin": "PIN",
    "login.phone.submit": "Sign in with phone + PIN",
    "login.phone.submitLoading": "Signing in...",
    "login.phone.forgotPin": "Forgot PIN?",
    "login.email.subtitle": "Standard sign-in",
    "login.email.fieldEmail": "Email",
    "login.email.submit": "Sign in",
    "login.email.submitLoading": "Signing in...",
    "login.common.password": "Password",
    "login.common.forgotPassword": "Forgot password?",
    "login.username.subtitle": "Sign in with username",
    "login.username.fieldUsername": "Username",
    "login.username.passwordAriaLabel": "Password (username)",
    "login.username.submit": "Sign in (username)",
    "login.username.submitLoading": "Signing in...",
    "login.sso.subtitle": "School SSO",
    "login.errors.invalidPhone": "Invalid number (9 digits expected).",
    "login.errors.invalidPin": "Invalid PIN (6 digits expected).",
    "login.errors.invalidEmail": "Invalid email address.",
    "login.errors.passwordRequired": "Password is required.",
    "login.errors.invalidUsername": "Invalid username (3 characters minimum).",
    "login.errors.invalidSession": "Invalid session after login",
    "login.errors.noSchool": "No school associated with this account",
    "login.errors.connectionError": "Connection error",
    "login.errors.invalidPhonePin": "Invalid phone or PIN",
    "login.errors.invalidEmailPassword": "Invalid email or password",
    "login.errors.invalidUsernamePassword": "Invalid username or password",

    "onboarding.errors.loadOptionsFailed": "Unable to load activation options.",
    "onboarding.errors.connectionError": "Connection error.",
    "onboarding.errors.passwordChangeFailed": "Unable to change the password.",
    "onboarding.errors.activationFailed": "Unable to activate the account.",
    "onboarding.errors.networkError": "Network error.",
    "onboarding.errors.invalidLinkMissingEmail": "Invalid link: missing email.",
    "onboarding.errors.temporaryPasswordRequired":
      "The temporary password is required.",
    "onboarding.errors.passwordMinLength":
      "The password must be at least 8 characters long.",
    "onboarding.errors.passwordComplexity":
      "The password must be at least 8 characters long with uppercase, lowercase and numbers.",
    "onboarding.errors.confirmPasswordRequired": "Confirm the password.",
    "onboarding.errors.passwordConfirmMismatch":
      "The confirmation does not match the new password.",
    "onboarding.errors.invalidUsername": "Invalid username.",
    "onboarding.errors.invalidEmail": "Invalid email address.",
    "onboarding.errors.missingSetupToken": "Missing onboarding token.",
    "onboarding.errors.firstNameRequired": "First name is required.",
    "onboarding.errors.lastNameRequired": "Last name is required.",
    "onboarding.errors.genderRequired": "Gender is required.",
    "onboarding.errors.birthDateRequired": "Date of birth is required.",
    "onboarding.errors.invalidDateFormat": "Invalid date format (yyyy-mm-dd).",
    "onboarding.errors.birthDateInFuture":
      "Date of birth cannot be in the future.",
    "onboarding.errors.newPinDigits": "The new PIN must have 6 digits.",
    "onboarding.errors.confirmPinRequired": "Confirm the new PIN.",
    "onboarding.errors.pinConfirmMismatch":
      "The confirmation does not match the new PIN.",
    "onboarding.errors.chooseThreeQuestions": "Choose exactly 3 questions.",
    "onboarding.errors.questionsMustDiffer":
      "The 3 questions must be different.",
    "onboarding.errors.answerMinLength":
      "Each answer must be at least 2 characters long.",
    "onboarding.errors.parentClassRequired": "Your child's class is required.",
    "onboarding.errors.parentStudentRequired": "Your child's name is required.",

    "onboarding.shell.title": "Account activation",
    "onboarding.success.title": "Setup complete",
    "onboarding.success.description":
      "Your account has been successfully configured. You will be redirected to the sign-in screen to log in securely.",
    "onboarding.hero.badge": "Secure onboarding",
    "onboarding.hero.title": "Activate your account in one sequence",
    "onboarding.hero.description":
      "Fill in the activation information, your profile and your recovery questions. At the end, you'll be taken straight back to sign-in.",
    "onboarding.hero.step1Token": "Step 1: optional email.",
    "onboarding.hero.step1Password":
      "Step 1: temporary password and new password.",
    "onboarding.hero.step2":
      "Step 2: personal information (first name, last name, gender, date of birth).",
    "onboarding.hero.step3Token": "Step 3: change your sign-in PIN.",
    "onboarding.hero.step3Recovery":
      "Step 3: recovery questions then final validation.",
    "onboarding.hero.step4":
      "Step 4: recovery questions then final validation.",
    "onboarding.hero.imageAlt": "Classroom scene",
    "onboarding.form.title": "Complete activation",
    "onboarding.form.stepLabel": "Step",
    "onboarding.form.accountLabel": "Account",
    "onboarding.form.accountPending": "Pending account",
    "onboarding.form.emailOptional": "Email (optional)",
    "onboarding.form.emailOptionalHint":
      "You can continue without an email and add it later in your account.",
    "onboarding.form.usernameLabel": "Username:",
    "onboarding.form.temporaryPassword": "Temporary password",
    "onboarding.form.newPassword": "New password",
    "onboarding.form.confirmation": "Confirmation",
    "onboarding.form.firstName": "Your first name",
    "onboarding.form.lastName": "Your last name",
    "onboarding.form.gender": "Your gender",
    "onboarding.form.select": "Select",
    "onboarding.form.male": "Male",
    "onboarding.form.female": "Female",
    "onboarding.form.otherGender": "Other",
    "onboarding.form.birthDate": "Your date of birth",
    "onboarding.form.pinSectionTitle": "Change your sign-in PIN",
    "onboarding.form.newPin": "New PIN",
    "onboarding.form.confirmPin": "Confirm PIN",
    "onboarding.form.chooseQuestions": "Choose 3 recovery questions",
    "onboarding.form.yourAnswer": "Your answer",
    "onboarding.form.childClass": "Your child's class",
    "onboarding.form.selectClass": "Select a class",
    "onboarding.form.childName": "Your child's name",
    "onboarding.form.selectStudent": "Select a student",
    "onboarding.form.loadingOptions": "Loading options...",
    "onboarding.form.continue": "Continue",
    "onboarding.form.submitting": "Submitting...",
    "onboarding.form.submit": "Complete activation",

    "recovery.password.shell.title": "Password recovery",
    "recovery.password.cardTitle": "Forgot password",
    "recovery.password.step1": "Step 1/3: request a link",
    "recovery.password.step2": "Step 2/3: verification",
    "recovery.password.step3": "Step 3/3: new password",
    "recovery.password.fields.email": "Account email",
    "recovery.password.fields.birthDate": "Date of birth",
    "recovery.password.fields.newPassword": "New password",
    "recovery.password.fields.confirmation": "Confirmation",
    "recovery.password.submit.sending": "Sending...",
    "recovery.password.submit.send": "Send link",
    "recovery.password.submit.verifying": "Verifying...",
    "recovery.password.submit.verify": "Verify my identity",
    "recovery.password.submit.resetting": "Resetting...",
    "recovery.password.submit.reset": "Reset my password",
    "recovery.password.loadingLink": "Loading link...",
    "recovery.password.loading": "Loading...",
    "recovery.password.accountDetected": "Account detected:",
    "recovery.password.linkInvalid":
      "This link is no longer valid. Request a new reset link.",
    "recovery.password.newRequest": "New request",
    "recovery.password.backToLogin": "Back to sign in",
    "recovery.password.errors.invalidEmail": "Invalid email address.",
    "recovery.password.errors.invalidLink": "Invalid link.",
    "recovery.password.errors.birthDateRequired": "Date of birth is required.",
    "recovery.password.errors.answerRequiredPrefix": "Answer required",
    "recovery.password.errors.passwordMinLength":
      "The password must be at least 8 characters long.",
    "recovery.password.errors.passwordComplexity":
      "The password must be at least 8 characters long with uppercase, lowercase and numbers.",
    "recovery.password.errors.confirmPasswordRequired": "Confirm the password.",
    "recovery.password.errors.passwordConfirmMismatch":
      "The confirmation does not match the new password.",
    "recovery.password.errors.invalidOrExpiredLink":
      "Invalid or expired reset link.",
    "recovery.password.errors.networkError": "Network error.",
    "recovery.password.errors.requestFailed":
      "Request failed. Please try again.",
    "recovery.password.errors.invalidRecoveryInfo":
      "Invalid recovery information.",
    "recovery.password.errors.resetFailed": "Unable to reset the password.",
    "recovery.password.success.requestSentDefault":
      "If this account exists, a reset link has been sent.",
    "recovery.password.success.verified":
      "Verification successful. Set your new password.",
    "recovery.password.toast.requestSent.title": "Request sent",
    "recovery.password.toast.requestSent.description":
      "If this account exists, the reset request has been received. You will be redirected to sign-in.",
    "recovery.password.toast.passwordReset.title": "Password reset",
    "recovery.password.toast.passwordReset.description":
      "Your new password has been saved. You will be redirected to sign-in.",

    "recovery.username.shell.title": "Username recovery",
    "recovery.username.cardTitle": "Forgot password (username)",
    "recovery.username.step1": "Step 1/3: enter your username",
    "recovery.username.fields.username": "Username",
    "recovery.username.usernamePlaceholder": "FirstnameLASTNAME",
    "recovery.username.identifierLabel": "Username:",
    "recovery.username.submit.searching": "Searching...",
    "recovery.username.submit.continue": "Continue",
    "recovery.username.noQuestionsConfigured":
      "No recovery questions are configured for this account. Contact your school administration.",
    "recovery.username.loading": "Loading...",
    "recovery.username.errors.usernameInvalid":
      "Invalid username (3 characters minimum).",
    "recovery.username.errors.usernameNotFound": "Username not found.",
    "recovery.pin.shell.title": "PIN recovery",
    "recovery.pin.cardTitle": "Lost PIN",
    "recovery.pin.cardSubtitle": "Recover access with your security questions",
    "recovery.pin.fields.emailOptional": "Email (optional)",
    "recovery.pin.fields.phoneOptional": "Phone (optional)",
    "recovery.pin.emailPlaceholder": "firstname.lastname@gmail.com",
    "recovery.pin.phonePlaceholder": "6XXXXXXXX",
    "recovery.pin.pinPlaceholder": "123456",
    "recovery.pin.submit.loadingOptions": "Loading...",
    "recovery.pin.submit.continueToQuestions": "Continue to recovery questions",
    "recovery.pin.submit.verifying": "Verifying...",
    "recovery.pin.submit.verify": "Verify my answers",
    "recovery.pin.fields.newPin": "New PIN (6 digits)",
    "recovery.pin.fields.confirmPin": "Confirm PIN",
    "recovery.pin.submit.resetting": "Resetting...",
    "recovery.pin.submit.reset": "Set my new PIN",
    "recovery.pin.success.verified":
      "Verification successful. You can now set a new PIN.",
    "recovery.pin.errors.loadOptionsFailed":
      "Unable to load the recovery questions.",
    "recovery.pin.errors.questionsNotLoaded":
      "Load the recovery questions first.",
    "recovery.pin.errors.resetFailed": "Unable to reset the PIN.",
    "recovery.pin.errors.emailOrPhoneRequired":
      "Provide an email or a phone number.",
    "recovery.pin.errors.invalidPhone": "Invalid number (9 digits expected).",
    "recovery.pin.errors.invalidSession": "Invalid recovery session.",
    "recovery.pin.errors.pinFormat": "The PIN must contain exactly 6 digits.",
    "recovery.pin.errors.confirmPinRequired": "Confirm the PIN.",
    "recovery.pin.errors.pinConfirmMismatch":
      "The confirmation does not match the new PIN.",
    "recovery.pin.toast.title": "PIN reset",
    "recovery.pin.toast.description":
      "Your new PIN has been saved. You will be redirected to sign-in.",
    "firstPassword.shell.title": "First sign-in",
    "firstPassword.success.title": "Password set",
    "firstPassword.success.subtitle": "Redirecting...",
    "firstPassword.success.message":
      "Your password has been set successfully. You will be redirected to sign-in.",
    "firstPassword.cardTitle": "Set my password",
    "firstPassword.cardSubtitle": "First sign-in — choose a secure password",
    "firstPassword.identifierLabel": "Username:",
    "firstPassword.fields.confirmPassword": "Confirm password",
    "firstPassword.submit.saving": "Saving...",
    "firstPassword.submit.submit": "Set my password",
    "firstPassword.errors.changeFailed": "Unable to change the password.",
    "pendingAccount.cardLeft.title": "Pending account",
    "pendingAccount.cardLeft.subtitle":
      "Complete activation to access your school's data",
    "pendingAccount.cardLeft.description":
      "Your account has been created, but it must be activated before you can view your school data.",
    "pendingAccount.info.account": "Account:",
    "pendingAccount.info.school": "School:",
    "pendingAccount.info.methods": "Methods:",
    "pendingAccount.info.methodsValue": "Activation code or initial PIN",
    "pendingAccount.cardRight.title": "Activate account",
    "pendingAccount.cardRight.subtitle": "Confirmed phone + new PIN",
    "pendingAccount.fields.email": "Email",
    "pendingAccount.fields.accountPhone": "Account phone",
    "pendingAccount.fields.confirmedPhone": "Confirmed phone",
    "pendingAccount.fields.activationCode": "Activation code (optional)",
    "pendingAccount.fields.initialPin": "Initial PIN (optional)",
    "pendingAccount.fields.newPin": "New PIN (6 digits)",
    "pendingAccount.placeholders.email": "firstname.lastname@gmail.com",
    "pendingAccount.placeholders.phone": "6XXXXXXXX",
    "pendingAccount.placeholders.activationCode": "E.g.: A1B2C3D4",
    "pendingAccount.placeholders.initialPin": "Temporary PIN provided",
    "pendingAccount.placeholders.newPin": "123456",
    "pendingAccount.submit.activating": "Activating...",
    "pendingAccount.submit.activate": "Activate my account",
    "pendingAccount.success.activated": "Account activated successfully.",
    "pendingAccount.errors.activationMethodRequired":
      "Enter an activation code or your initial PIN.",
    "pendingAccount.errors.newPinFormat":
      "The new PIN must contain exactly 6 digits.",
    "pendingAccount.errors.loadOptionsFailed":
      "Unable to load activation options",
    "pendingAccount.errors.loadError": "Error while loading",
    "pendingAccount.errors.activationFailed":
      "Activation failed. Check your information.",
    "profileSetup.redirecting": "Redirecting to the new onboarding...",
    "authError.title": "Authentication error",
    "authError.codeLabel": "Code:",
    "authError.hint.noCode":
      "OAuth error without explicit code. Check AUTH_SECRET/NEXTAUTH_SECRET, AUTH_URL/NEXTAUTH_URL and the active providers.",
    "authError.hint.configuration":
      "Invalid NextAuth configuration. Check AUTH_SECRET and the provider credentials.",
    "authError.hint.accessDenied":
      "Access denied by the provider or by the application callbacks.",
    "authError.hint.oauthHandshake":
      "OAuth handshake failed. Check AUTH_URL/NEXTAUTH_URL and the redirect URIs.",
    "authError.hint.accountNotLinked":
      "This provider account is already linked to another user.",
    "authError.hint.default":
      "Check the [next-auth][error] server logs for technical details.",
    "verifyEmail.noToken.title": "Invalid link",
    "verifyEmail.noToken.message":
      "This verification link is incomplete or malformed.",
    "verifyEmail.success.title": "Email verified!",
    "verifyEmail.success.followUp":
      "You can now use your email address to sign in.",
    "verifyEmail.failure.title": "Verification failed",
    "verifyEmail.backToHome": "Back to home",
    "verifyEmail.fallback.verified": "Email verified successfully.",
    "verifyEmail.fallback.invalidOrExpired": "Invalid or expired link.",
    "verifyEmail.fallback.serverError":
      "Unable to contact the server. Please try again later.",
    "ssoProfile.shell.title": "SSO profile recovery",
    "ssoProfile.cardTitle": "Complete your profile",
    "ssoProfile.cardSubtitle":
      "Some information is required before your first sign-in",
    "ssoProfile.infoBox":
      "Complete your SSO profile to secure access to your account.",
    "ssoProfile.fields.firstName": "First name",
    "ssoProfile.fields.lastName": "Last name",
    "ssoProfile.fields.gender": "Gender",
    "ssoProfile.fields.phone": "Phone",
    "ssoProfile.fields.pin": "PIN (6 digits)",
    "ssoProfile.gender.male": "Male",
    "ssoProfile.gender.female": "Female",
    "ssoProfile.gender.other": "Other",
    "ssoProfile.missingFieldsPrefix": "Missing fields detected",
    "ssoProfile.submit.saving": "Saving...",
    "ssoProfile.submit.submit": "Complete my profile",
    "ssoProfile.errors.firstNameRequired": "First name required.",
    "ssoProfile.errors.lastNameRequired": "Last name required.",
    "ssoProfile.errors.invalidSession": "Invalid SSO session.",
    "ssoProfile.errors.ssoLoginFailed":
      "SSO sign-in failed after profile completion.",
    "ssoProfile.errors.sessionInvalidAfterLogin":
      "Invalid session after SSO sign-in",
    "ssoProfile.errors.noSchoolLinked": "No school linked to this account",
    "ssoProfile.errors.incompleteSession": "Incomplete SSO session",
    "ssoProfile.errors.loadProfileFailed":
      "Unable to load SSO profile information",
    "ssoProfile.errors.completionFailed": "Unable to complete the profile.",
    "ssoProfile.errors.generic": "Error",
    "platformCredentials.cardTitle": "Complete your credentials",
    "platformCredentials.cardSubtitle":
      "To secure your access, fill in the missing information.",
    "platformCredentials.accountLabel": "Account:",
    "platformCredentials.fields.newPassword": "New password",
    "platformCredentials.fields.confirmPassword": "Confirm password",
    "platformCredentials.fields.phone": "Phone",
    "platformCredentials.fields.confirmPhone": "Confirm phone",
    "platformCredentials.fields.newPin": "New PIN (6 digits)",
    "platformCredentials.fields.confirmPin": "Confirm PIN",
    "platformCredentials.submit.validating": "Validating...",
    "platformCredentials.submit.validate": "Submit",
    "platformCredentials.errors.invalidSession": "Invalid session.",
    "platformCredentials.errors.confirmPasswordMismatch":
      "Password confirmation does not match.",
    "platformCredentials.errors.confirmPhoneMismatch":
      "Phone confirmation does not match.",
    "platformCredentials.errors.confirmPinMismatch":
      "PIN confirmation does not match.",
    "platformCredentials.errors.configFailed": "Configuration failed.",

    "common.close": "Close",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.configure": "Configure",
    "common.errors.invalidCsrfSession":
      "Invalid CSRF session. Please sign in again.",

    "account.password.title": "Password",
    "account.password.notConfigured": "Not configured",
    "account.password.closeAriaLabel": "Close password section",
    "account.password.createAriaLabel": "Create a password",
    "account.password.editAriaLabel": "Edit password",
    "account.password.create.intro":
      "Your account doesn't have a password yet. Set one to be able to sign in with your email.",
    "account.password.fields.newPassword": "New password",
    "account.password.fields.confirmPassword": "Confirm password",
    "account.password.fields.currentPassword": "Old password",
    "account.password.fields.confirmNewPassword": "Confirm new password",
    "account.password.create.submit.creating": "Creating...",
    "account.password.create.submit.create": "Create password",
    "account.password.submit.updating": "Updating...",
    "account.password.submit.change": "Change password",
    "account.password.errors.currentRequired":
      "The current password is required.",
    "account.password.errors.confirmMismatch":
      "The confirmation does not match the new password.",
    "account.password.errors.createFailed": "Unable to create the password.",
    "account.password.errors.changeFailed": "Unable to change the password.",
    "account.password.success.created": "Password created successfully.",
    "account.password.success.updated": "Password updated successfully.",

    "account.pin.title": "Login PIN",
    "account.pin.notConfigured": "Not configured",
    "account.pin.closeAriaLabel": "Close PIN section",
    "account.pin.configureAriaLabel": "Configure phone and PIN",
    "account.pin.editAriaLabel": "Edit PIN",
    "account.pin.addPhone.intro":
      "Add a phone number and a PIN code to sign in from mobile.",
    "account.pin.fields.phone": "Phone (9 digits)",
    "account.pin.fields.pinCode": "PIN code (6 digits)",
    "account.pin.fields.confirmPin": "Confirm PIN",
    "account.pin.fields.currentPin": "Current PIN",
    "account.pin.fields.newPin": "New PIN (6 digits)",
    "account.pin.fields.confirmNewPin": "Confirm PIN",
    "account.pin.addPhone.submit.configuring": "Configuring...",
    "account.pin.submit.updating": "Updating PIN...",
    "account.pin.submit.change": "Change PIN",
    "account.pin.errors.currentFormat":
      "The current PIN must contain 6 digits.",
    "account.pin.errors.newFormat": "The new PIN must contain 6 digits.",
    "account.pin.errors.confirmMismatch":
      "The confirmation does not match the new PIN.",
    "account.pin.errors.pinMismatch": "The PINs do not match.",
    "account.pin.errors.addPhoneFailed": "Unable to add the phone.",
    "account.pin.errors.changeFailed": "Unable to change the PIN.",
    "account.pin.success.configured": "Phone and PIN configured successfully.",
    "account.pin.success.updated": "PIN updated successfully.",

    "discipline.types.absence": "Absence",
    "discipline.types.retard": "Late arrival",
    "discipline.types.sanction": "Sanction",
    "discipline.types.punition": "Punishment",

    "discipline.common.yes": "Yes",
    "discipline.common.no": "No",
    "discipline.common.loading": "Loading...",
    "discipline.common.cancel": "Cancel",
    "discipline.common.delete": "Delete",
    "discipline.common.networkError": "Network error.",
    "discipline.common.csrfInvalid":
      "Invalid CSRF session. Please log in again.",

    "discipline.list.columns.type": "Type",
    "discipline.list.columns.date": "Date",
    "discipline.list.columns.reason": "Reason",
    "discipline.list.columns.duration": "Duration",
    "discipline.list.columns.justified": "Justified",
    "discipline.list.columns.author": "Author",
    "discipline.list.columns.actions": "Actions",
    "discipline.list.editAria": "Edit this event",
    "discipline.list.deleteAria": "Delete this event",
    "discipline.list.durationPrefix": "Duration:",
    "discipline.list.justifiedPrefix": "Justified:",
    "discipline.list.authorPrefix": "Author:",

    "discipline.page.defaultClassName": "Class",
    "discipline.page.subtitle": "Absences, lateness, sanctions and punishments",
    "discipline.page.tabs.entry": "Entry",
    "discipline.page.tabs.history": "History",
    "discipline.page.tabs.help": "Help",
    "discipline.page.classNotAccessible":
      "Class not accessible with your assignments.",
    "discipline.page.studentLabel": "Student",

    "discipline.help.summary":
      "this module lets the teacher record absences, lateness, sanctions and punishments for their assigned classes.",
    "discipline.help.record.name": "Record",
    "discipline.help.record.purpose": "quickly record a school life event.",
    "discipline.help.record.howTo":
      "select the student then fill in the type, date and reason.",
    "discipline.help.record.moduleImpact":
      "the event is visible to the parent in School life (current year).",
    "discipline.help.record.crossModuleImpact":
      "it then feeds the Cursus page for the overall history.",
    "discipline.help.verify.name": "Check",
    "discipline.help.verify.purpose": "review the student's discipline log.",
    "discipline.help.verify.howTo": "open History to see existing events.",
    "discipline.help.verify.moduleImpact": "avoids duplicate entries.",
    "discipline.help.verify.crossModuleImpact":
      "facilitates coordination with SCHOOL_MANAGER/SUPERVISOR.",

    "discipline.errors.loadClass": "Unable to load the class.",
    "discipline.errors.loadHistory": "Unable to load the discipline history.",
    "discipline.errors.createFailed": "Unable to create.",
    "discipline.errors.editFailed": "Unable to update.",
    "discipline.errors.deleteFailed": "Unable to delete.",
    "discipline.success.eventCreated": "Discipline event recorded.",
    "discipline.success.eventUpdated": "Event updated.",
    "discipline.success.eventDeleted": "Event deleted.",

    "discipline.validation.dateRequired": "Date is required.",
    "discipline.validation.reasonRequired": "Reason is required.",
    "discipline.validation.durationPositive":
      "Duration must be a positive integer.",

    "discipline.form.type": "Event type",
    "discipline.form.typeEditAria": "Event type edit",
    "discipline.form.dateTime": "Date and time",
    "discipline.form.dateTimeEditAria": "Date and time edit",
    "discipline.form.reason": "Reason",
    "discipline.form.reasonEditAria": "Reason edit",
    "discipline.form.reasonPlaceholder":
      "E.g.: unfinished homework, unjustified absence",
    "discipline.form.duration": "Duration (minutes, optional)",
    "discipline.form.durationEditAria": "Duration edit (minutes, optional)",
    "discipline.form.comment": "Comment (optional)",
    "discipline.form.commentEditAria": "Comment edit (optional)",
    "discipline.form.justified": "Justified (absence / lateness)",
    "discipline.form.saving": "Saving...",
    "discipline.form.submitCreate": "Save event",
    "discipline.form.submitUpdate": "Save changes",
    "discipline.form.submitReport": "Report",
    "discipline.form.cancel": "Cancel",

    "discipline.eleves.sectionTitle":
      "School life: absences, lateness, sanctions and punishments",

    "discipline.empty.studentEvents": "No events for this student.",
    "discipline.empty.eleves": "No school life events.",

    "discipline.delete.title": "Delete this event?",
    "discipline.delete.message":
      'This action cannot be undone. The event "{label}" will be permanently deleted.',
    "discipline.delete.confirm": "Delete",

    "discipline.vieScolaire.title": "School life",
    "discipline.vieScolaire.subtitleDefault": "Student tracking",
    "discipline.vieScolaire.eventsWarning":
      "School life events are temporarily unavailable. Showing demo data.",
    "discipline.vieScolaire.error": "Unable to load school life data.",
    "discipline.vieScolaire.tabs.synthese": "Summary",
    "discipline.vieScolaire.tabs.absencesRetards": "Absences / lateness",
    "discipline.vieScolaire.tabs.sanctionsPunitions": "Sanctions / punishments",
    "discipline.vieScolaire.kpi.absences": "Absences",
    "discipline.vieScolaire.kpi.retards": "Lateness",
    "discipline.vieScolaire.kpi.sanctions": "Sanctions",
    "discipline.vieScolaire.kpi.punitions": "Punishments",
    "discipline.vieScolaire.synthese.lastAbsence": "Last absence",
    "discipline.vieScolaire.synthese.lastRetard": "Last lateness",
    "discipline.vieScolaire.synthese.lastSanction": "Last sanction",
    "discipline.vieScolaire.synthese.lastPunition": "Last punishment",
    "discipline.vieScolaire.synthese.noData": "No data",
    "discipline.vieScolaire.absences.columns.event": "Absence / lateness",
    "discipline.vieScolaire.absences.columns.type": "Type",
    "discipline.vieScolaire.absences.columns.duration": "Duration",
    "discipline.vieScolaire.absences.columns.justified": "Justified?",
    "discipline.vieScolaire.absences.columns.reason": "Reason",
    "discipline.vieScolaire.absences.columns.comment": "Comment",
    "discipline.vieScolaire.absences.empty":
      "No events for the active school year.",
    "discipline.vieScolaire.absences.durationPrefix": "Duration:",
    "discipline.vieScolaire.absences.justifiedPrefix": "Justified:",
    "discipline.vieScolaire.absences.reasonPrefix": "Reason:",
    "discipline.vieScolaire.absences.commentPrefix": "Comment:",
    "discipline.vieScolaire.sanctions.columns.type": "Type",
    "discipline.vieScolaire.sanctions.columns.incident": "Incident",
    "discipline.vieScolaire.sanctions.columns.date": "Date",
    "discipline.vieScolaire.sanctions.columns.reason": "Reason",
    "discipline.vieScolaire.sanctions.columns.by": "By",
    "discipline.vieScolaire.sanctions.columns.comment": "Comment",
    "discipline.vieScolaire.sanctions.columns.executionDate": "Execution date",
    "discipline.vieScolaire.sanctions.empty":
      "No sanctions/punishments for the active school year.",
    "discipline.vieScolaire.sanctions.datePrefix": "Date:",
    "discipline.vieScolaire.sanctions.reasonPrefix": "Reason:",
    "discipline.vieScolaire.sanctions.byPrefix": "By:",
    "discipline.vieScolaire.sanctions.commentPrefix": "Comment:",
    "discipline.vieScolaire.sanctions.executionDatePrefix": "Execution date:",
    "discipline.vieScolaire.equipePedagogique": "Teaching staff",

    "discipline.accueil.summaryHint.none": "Nothing to flag",
    "discipline.accueil.summaryHint.unjustified":
      "{count} unjustified absence(s)",
    "discipline.accueil.summaryHint.sanctions":
      "{count} sanction(s) or punishment(s)",
    "discipline.accueil.panel.action": "View summary",
    "discipline.accueil.panel.noRecentEvent": "No recent school life event.",
    "discipline.accueil.metrics.unjustifiedAbsences": "Unjustified absences",
    "discipline.accueil.metrics.sanctionsPunitions": "Sanctions / punishments",
    "discipline.accueil.quickAccess.hint": "Absences, lateness, sanctions",

    "discipline.sidebar.vieScolaire": "School life",
    "discipline.sidebar.discipline": "Discipline",

    "discipline.cursus.title": "Cursus",
    "discipline.cursus.subtitleDefault": "Student history",
    "discipline.cursus.error": "Unable to load the cursus.",
    "discipline.cursus.tabs.synthese": "Summary",
    "discipline.cursus.tabs.vieScolaire": "School life",
    "discipline.cursus.tabs.help": "Help",
    "discipline.cursus.filters.year": "Year",
    "discipline.cursus.filters.class": "Class",
    "discipline.cursus.filters.type": "Type",
    "discipline.cursus.filters.allFeminine": "All",
    "discipline.cursus.filters.allMasculine": "All",
    "discipline.cursus.filters.reset": "Reset",
    "discipline.cursus.filters.exportPdf": "Export PDF",
    "discipline.cursus.notDefined.year": "Year not set",
    "discipline.cursus.notDefined.class": "Class not set",
    "discipline.cursus.synthese.yearsClasses": "Years / classes",
    "discipline.cursus.empty": "No school life event on the cursus yet.",
    "discipline.cursus.help.moduleName": "Cursus",
    "discipline.cursus.help.summary":
      "this module will summarize the student's path year by year and class by class.",
    "discipline.cursus.help.actionName": "View",
    "discipline.cursus.help.actionPurpose":
      "analyze the student's overall history.",
    "discipline.cursus.help.actionHowTo":
      "open the School life tab for a recap by year/class.",
    "discipline.cursus.help.actionModuleImpact":
      "chronological view of the path's events.",
    "discipline.cursus.help.actionCrossModuleImpact":
      "complements the current School life page which only shows the active year.",

    "discipline.dashboard.cardTitle": "School life",
    "discipline.dashboard.cardEyebrow": "Discipline",
    "discipline.dashboard.empty":
      "No child linked or no school life data available.",
    "discipline.dashboard.stats.absences": "Absences",
    "discipline.dashboard.stats.retards": "Lateness",
    "discipline.dashboard.stats.incidents": "Incidents",
    "discipline.dashboard.openDetail": "Open discipline details",
    "discipline.dashboard.status.calm": "Calm situation",
    "discipline.dashboard.status.watch": "To watch",
    "discipline.dashboard.status.alert": "Parent priority",
    "discipline.dashboard.detail.none":
      "No notable disciplinary signal for the period.",
    "discipline.dashboard.detail.unjustifiedAbsences":
      "{count} unjustified absence(s) to clear.",
    "discipline.dashboard.detail.incidentsRecorded":
      "{count} incident(s) recorded for the period.",
    "discipline.dashboard.detail.absencesRecorded":
      "{count} absence(s) recorded.",
    "discipline.dashboard.detail.retardsThisTerm":
      "{count} late arrival(s) this term.",

    "discipline.mail.subjectCreated": "Scolive - School life event recorded",
    "discipline.mail.subjectUpdated": "Scolive - School life event updated",
    "discipline.mail.actionCreated": "recorded",
    "discipline.mail.actionUpdated": "updated",
    "discipline.mail.greeting": "Hello {firstName},",
    "discipline.mail.intro":
      "A school life event has been {action} for {studentFullName}.",
    "discipline.mail.type": "Type",
    "discipline.mail.reason": "Reason",
    "discipline.mail.date": "Date",
    "discipline.mail.class": "Class",
    "discipline.mail.author": "Recorded by",
    "discipline.mail.openPortal": "Open the portal",
    "discipline.mail.consultPortal": "View the portal",

    "homework.page.title": "Homework",
    "homework.page.defaultClassName": "Class",
    "homework.page.subtitle": "Homework tracking and submission status",
    "homework.page.classNotAccessible":
      "Class not accessible with your assignments.",

    "homework.tabs.list": "List",
    "homework.tabs.view": "View",
    "homework.tabs.help": "Help",

    "homework.status.todo": "To do",
    "homework.status.late": "Late",
    "homework.status.done": "Done",

    "homework.table.title": "Title",
    "homework.table.subject": "Subject",
    "homework.table.dueDate": "Due date",
    "homework.table.status": "Status",

    "homework.common.loading": "Loading...",
    "homework.errors.loadFailed": "Unable to load class homework.",
    "homework.errors.networkError": "Network error.",

    "homework.help.summary":
      "this module centralizes homework assigned to the class and its tracking status.",
    "homework.help.list.name": "List",
    "homework.help.list.purpose": "track ongoing homework.",
    "homework.help.list.howTo": "open the List tab.",
    "homework.help.list.moduleImpact":
      "helps manage student workload individually.",
    "homework.help.list.crossModuleImpact":
      "linked with Grades to assess submissions.",
    "homework.help.view.name": "View",
    "homework.help.view.purpose": "get a quick overview of the class.",
    "homework.help.view.howTo": "open the View tab.",
    "homework.help.view.moduleImpact": "prioritize follow-ups.",
    "homework.help.view.crossModuleImpact":
      "improves parent tracking via child spaces.",

    "homework.summary.class": "Class",
    "homework.summary.total": "Homework",
    "homework.summary.todo": "To do",
    "homework.summary.late": "Late",

    "homework.sidebar.devoirs": "Homework",
    "homework.sidebar.cahierDeTexte": "Homework notebook",

    "homework.dashboard.title": "Ongoing homework",
    "homework.dashboard.noHomework": "No homework in progress",
    "homework.dashboard.viewAll": "View all",

    "homework.cahierDeTexte.title": "Homework notebook",
    "homework.cahierDeTexte.subtitle": "Work to do",
    "homework.cahierDeTexte.summary":
      "View your child's homework and instructions.",
    "homework.cahierDeTexte.bullet1":
      "Today's homework and assignments to submit.",
    "homework.cahierDeTexte.bullet2": "Instructions shared by teachers.",
    "homework.cahierDeTexte.bullet3": "Plan the week ahead with your child.",
  },
};
