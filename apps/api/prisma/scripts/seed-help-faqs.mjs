import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function richAnswer({ intro, bullets, closing }) {
  return [
    `<p>${intro}</p>`,
    `<ul>${bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>`,
    closing ? `<p>${closing}</p>` : "",
  ].join("");
}

const FAQ_DEFINITIONS = [
  {
    audience: "PARENT",
    title: "FAQ Parent Scolive",
    slug: "faq-parent-scolive",
    description:
      "Réponses rapides pour suivre la scolarité de votre enfant et échanger avec l'école.",
    themes: [
      {
        title: "Connexion et accès",
        description: "Premiers accès, mot de passe et changement d'appareil.",
        items: [
          {
            question: "Comment récupérer mon mot de passe parent ?",
            answerHtml: richAnswer({
              intro:
                "Depuis l'écran de connexion, utilisez le lien de récupération adapté à votre mode d'identification.",
              bullets: [
                "Choisissez 'Mot de passe oublié'.",
                "Saisissez l'email ou le numéro de téléphone rattaché au compte parent.",
                "Suivez le code de vérification ou le lien reçu pour définir un nouveau mot de passe.",
              ],
              closing:
                "Si aucun message n'arrive, vérifiez les spams puis contactez l'école pour confirmer vos coordonnées.",
            }),
          },
          {
            question: "Pourquoi mon enfant n'apparaît pas sur mon compte ?",
            answerHtml: richAnswer({
              intro:
                "L'enfant visible dépend du rattachement parent-enfant réalisé par l'établissement.",
              bullets: [
                "Actualisez la session en vous déconnectant puis reconnectant.",
                "Vérifiez que vous utilisez bien le compte communiqué à l'école.",
                "Demandez au secrétariat de contrôler le lien entre votre profil parent et le dossier élève.",
              ],
            }),
          },
          {
            question: "Puis-je utiliser mon compte sur plusieurs téléphones ?",
            answerHtml: richAnswer({
              intro:
                "Oui, le même compte peut être utilisé sur plusieurs appareils personnels.",
              bullets: [
                "Connectez-vous avec les mêmes identifiants sur chaque appareil.",
                "Activez les notifications sur chaque téléphone si vous voulez être alerté partout.",
                "Déconnectez les appareils qui ne sont plus utilisés pour garder vos accès maîtrisés.",
              ],
            }),
          },
        ],
      },
      {
        title: "Suivi scolaire",
        description: "Notes, devoirs et informations pédagogiques.",
        items: [
          {
            question: "Où consulter les notes et appréciations de mon enfant ?",
            answerHtml: richAnswer({
              intro:
                "Le module Notes regroupe les évaluations publiées par les enseignants.",
              bullets: [
                "Ouvrez Notes puis sélectionnez la période souhaitée.",
                "Consultez la note, le coefficient et le commentaire associé.",
                "Comparez les matières pour repérer rapidement les besoins d'accompagnement.",
              ],
            }),
          },
          {
            question: "Comment voir les devoirs à venir ?",
            answerHtml: richAnswer({
              intro:
                "Le cahier de texte et l'agenda affichent les tâches données par les enseignants.",
              bullets: [
                "Ouvrez l'emploi du temps ou le cahier de texte.",
                "Filtrez par semaine si vous voulez préparer les prochains jours.",
                "Vérifiez les pièces jointes ou consignes détaillées sur chaque travail demandé.",
              ],
            }),
          },
          {
            question:
              "Comment savoir si une nouvelle évaluation a été publiée ?",
            answerHtml: richAnswer({
              intro:
                "Les nouvelles publications peuvent apparaître dans les notifications et dans le module Notes.",
              bullets: [
                "Consultez vos notifications après chaque période d'évaluations.",
                "Ouvrez directement Notes pour vérifier les nouvelles lignes publiées.",
                "Assurez-vous que les notifications sont autorisées sur votre téléphone.",
              ],
            }),
          },
        ],
      },
      {
        title: "Vie scolaire",
        description: "Absences, retards, discipline et échanges utiles.",
        items: [
          {
            question: "Comment justifier une absence de mon enfant ?",
            answerHtml: richAnswer({
              intro:
                "La justification dépend du flux mis en place par votre établissement.",
              bullets: [
                "Ouvrez la fiche d'absence dans Vie scolaire si l'action est disponible.",
                "Ajoutez les informations utiles et le justificatif demandé.",
                "Vérifiez ensuite le changement de statut de l'absence.",
              ],
            }),
          },
          {
            question: "Où voir les retards signalés par l'école ?",
            answerHtml: richAnswer({
              intro:
                "Les retards sont visibles dans la section Vie scolaire du profil élève.",
              bullets: [
                "Filtrez les événements par type pour isoler les retards.",
                "Contrôlez les dates, créneaux et commentaires associés.",
                "Prenez contact avec la vie scolaire si une ligne semble erronée.",
              ],
            }),
          },
          {
            question: "Comment contacter rapidement l'enseignant principal ?",
            answerHtml: richAnswer({
              intro:
                "La messagerie permet d'écrire directement au bon interlocuteur depuis l'application.",
              bullets: [
                "Ouvrez Messagerie puis cliquez sur nouveau message.",
                "Choisissez l'enseignant principal ou le service concerné.",
                "Rédigez un objet explicite pour accélérer le traitement.",
              ],
            }),
          },
        ],
      },
    ],
  },
  {
    audience: "STUDENT",
    title: "FAQ Élève Scolive",
    slug: "faq-eleve-scolive",
    description:
      "Réponses rapides pour s'organiser, suivre ses résultats et rester à jour.",
    themes: [
      {
        title: "Compte et connexion",
        description: "Accès au compte et sécurité de connexion.",
        items: [
          {
            question: "Que faire si j'ai oublié mon mot de passe ?",
            answerHtml: richAnswer({
              intro:
                "Utilise le lien de récupération depuis l'écran de connexion.",
              bullets: [
                "Choisis 'Mot de passe oublié'.",
                "Saisis l'email ou le numéro associé à ton compte.",
                "Définis un nouveau mot de passe avec le code ou le lien reçu.",
              ],
            }),
          },
          {
            question: "Pourquoi mes notifications n'arrivent pas ?",
            answerHtml: richAnswer({
              intro:
                "Les notifications dépendent des réglages du téléphone et de l'application.",
              bullets: [
                "Vérifie que les notifications sont autorisées pour Scolive.",
                "Confirme que ton téléphone n'est pas en mode économie agressive.",
                "Ouvre l'application régulièrement pour resynchroniser les données.",
              ],
            }),
          },
          {
            question: "Puis-je changer mon email ou mon numéro ?",
            answerHtml: richAnswer({
              intro:
                "Selon les règles de l'établissement, certaines informations peuvent être modifiables depuis le compte.",
              bullets: [
                "Va dans Compte ou Paramètres.",
                "Mets à jour l'information si le champ est éditable.",
                "Sinon, demande au service administratif d'effectuer la modification.",
              ],
            }),
          },
        ],
      },
      {
        title: "Travail et évaluations",
        description:
          "Organisation du travail personnel et lecture des résultats.",
        items: [
          {
            question: "Où retrouver mes devoirs à rendre ?",
            answerHtml: richAnswer({
              intro:
                "Le cahier de texte et l'agenda regroupent les consignes données en cours.",
              bullets: [
                "Consulte l'emploi du temps ou le cahier de texte.",
                "Repère les dates limites indiquées sur chaque devoir.",
                "Ouvre le détail pour voir les ressources jointes.",
              ],
            }),
          },
          {
            question: "Comment lire mes notes correctement ?",
            answerHtml: richAnswer({
              intro:
                "Une note se lit avec son coefficient et l'appréciation de l'enseignant.",
              bullets: [
                "Sélectionne la bonne période dans le module Notes.",
                "Regarde les commentaires pour comprendre le résultat.",
                "Compare plusieurs évaluations pour identifier une tendance.",
              ],
            }),
          },
          {
            question: "Comment demander de l'aide à un enseignant ?",
            answerHtml: richAnswer({
              intro:
                "La messagerie est le bon canal pour poser une question claire et ciblée.",
              bullets: [
                "Explique le chapitre ou l'exercice concerné.",
                "Précise ce que tu as déjà essayé.",
                "Demande un exemple ou une ressource complémentaire.",
              ],
            }),
          },
        ],
      },
      {
        title: "Vie scolaire",
        description: "Ponctualité, suivi des événements et règles d'usage.",
        items: [
          {
            question: "Comment voir mes absences et retards ?",
            answerHtml: richAnswer({
              intro:
                "Les événements enregistrés sont visibles dans la section Vie scolaire.",
              bullets: [
                "Ouvre la liste des événements.",
                "Filtre si besoin par absences ou retards.",
                "Vérifie les dates et remarques saisies par l'école.",
              ],
            }),
          },
          {
            question: "Pourquoi une sanction apparaît-elle sur mon compte ?",
            answerHtml: richAnswer({
              intro:
                "Les sanctions sont publiées par les responsables habilités de l'établissement.",
              bullets: [
                "Lis le motif et la date indiqués sur la fiche.",
                "Regarde s'il y a une action attendue ou un commentaire complémentaire.",
                "Adresse-toi à la vie scolaire si tu as besoin d'une explication.",
              ],
            }),
          },
          {
            question:
              "Comment rester informé des changements d'emploi du temps ?",
            answerHtml: richAnswer({
              intro:
                "Les changements peuvent être visibles dans les notifications et dans l'emploi du temps.",
              bullets: [
                "Consulte chaque jour les notifications.",
                "Vérifie l'emploi du temps avant de quitter la maison.",
                "Reste attentif aux annonces publiées par la classe ou l'établissement.",
              ],
            }),
          },
        ],
      },
    ],
  },
  {
    audience: "TEACHER",
    title: "FAQ Enseignant Scolive",
    slug: "faq-enseignant-scolive",
    description:
      "Réponses utiles pour publier, communiquer et piloter la classe au quotidien.",
    themes: [
      {
        title: "Notes et évaluations",
        description: "Création, saisie et publication des résultats.",
        items: [
          {
            question: "Comment créer une nouvelle évaluation ?",
            answerHtml: richAnswer({
              intro:
                "Le module Notes permet de préparer une évaluation par classe et matière.",
              bullets: [
                "Sélectionnez la classe, la matière et la période.",
                "Renseignez le titre, la date, le barème et le coefficient.",
                "Publiez immédiatement ou gardez le brouillon selon votre planning.",
              ],
            }),
          },
          {
            question: "Pourquoi je ne peux pas publier mes notes ?",
            answerHtml: richAnswer({
              intro:
                "Un blocage de publication provient souvent d'un champ incomplet ou d'un état de classe incohérent.",
              bullets: [
                "Vérifiez que toutes les notes ou absences ont été renseignées.",
                "Contrôlez le barème et le coefficient de l'évaluation.",
                "Rechargez la page si une erreur réseau s'est produite pendant la saisie.",
              ],
            }),
          },
          {
            question: "Comment corriger une note déjà publiée ?",
            answerHtml: richAnswer({
              intro:
                "Une note publiée peut être ajustée si le module vous y autorise encore.",
              bullets: [
                "Rouvrez l'évaluation concernée.",
                "Modifiez la valeur ou l'appréciation de l'élève.",
                "Enregistrez puis vérifiez la mise à jour côté liste.",
              ],
            }),
          },
        ],
      },
      {
        title: "Communication",
        description: "Messagerie, annonces et échanges avec les familles.",
        items: [
          {
            question: "Comment envoyer une information à toute une classe ?",
            answerHtml: richAnswer({
              intro:
                "Utilisez l'annonce de classe ou la messagerie groupée selon le besoin.",
              bullets: [
                "Choisissez le bon canal: information générale ou message ciblé.",
                "Rédigez un objet précis avec date et consignes.",
                "Vérifiez l'audience avant envoi.",
              ],
            }),
          },
          {
            question: "Comment retrouver un échange important avec un parent ?",
            answerHtml: richAnswer({
              intro:
                "La recherche dans la messagerie permet de retrouver rapidement un fil.",
              bullets: [
                "Cherchez par nom d'élève, parent ou mot-clé.",
                "Ouvrez le fil et vérifiez les dates d'envoi.",
                "Archivez la conversation lorsqu'elle est clôturée.",
              ],
            }),
          },
          {
            question: "Quand faut-il mettre la direction en copie ?",
            answerHtml: richAnswer({
              intro:
                "Les situations sensibles ou répétitives doivent rester traçables au niveau de l'établissement.",
              bullets: [
                "Ajoutez la direction pour les cas disciplinaires ou les demandes litigieuses.",
                "Gardez un ton factuel et centré sur les éléments observables.",
                "Proposez une suite claire: rendez-vous, appel ou action attendue.",
              ],
            }),
          },
        ],
      },
      {
        title: "Organisation de classe",
        description: "Cahier de texte, emploi du temps et suivi de classe.",
        items: [
          {
            question: "Comment publier le travail à faire ?",
            answerHtml: richAnswer({
              intro:
                "Le cahier de texte permet d'indiquer les devoirs et ressources associés à une séance.",
              bullets: [
                "Ajoutez l'objectif de séance et les consignes.",
                "Précisez l'échéance et le format attendu.",
                "Joignez les documents utiles si nécessaire.",
              ],
            }),
          },
          {
            question: "Comment signaler un changement de séance ?",
            answerHtml: richAnswer({
              intro:
                "Les changements doivent être visibles dans l'emploi du temps et relayés aux utilisateurs concernés.",
              bullets: [
                "Mettez à jour la séance ou l'emploi du temps.",
                "Envoyez une notification ou une annonce si l'information est urgente.",
                "Vérifiez que la nouvelle information s'affiche dans la journée concernée.",
              ],
            }),
          },
          {
            question: "Comment préparer le conseil de classe dans Scolive ?",
            answerHtml: richAnswer({
              intro:
                "Les modules de notes, discipline et messagerie permettent de centraliser les éléments de suivi.",
              bullets: [
                "Consultez les résultats par élève et les appréciations existantes.",
                "Relisez les événements disciplinaires ou absences notables.",
                "Préparez une synthèse concise avant la réunion.",
              ],
            }),
          },
        ],
      },
    ],
  },
  {
    audience: "SCHOOL_ADMIN",
    title: "FAQ Administration École Scolive",
    slug: "faq-administration-ecole-scolive",
    description:
      "Réponses utiles pour piloter l'établissement, les utilisateurs et les publications internes.",
    themes: [
      {
        title: "Utilisateurs et accès",
        description: "Création de comptes et suivi des accès école.",
        items: [
          {
            question: "Comment activer un nouveau compte enseignant ?",
            answerHtml: richAnswer({
              intro:
                "L'activation passe par la création ou la vérification du profil enseignant dans l'établissement.",
              bullets: [
                "Créez ou complétez la fiche utilisateur concernée.",
                "Associez l'enseignant à ses classes et matières.",
                "Vérifiez que les identifiants ou invitations ont bien été transmis.",
              ],
            }),
          },
          {
            question: "Comment corriger un numéro de téléphone erroné ?",
            answerHtml: richAnswer({
              intro:
                "Les informations de contact peuvent être mises à jour depuis la fiche utilisateur si votre rôle le permet.",
              bullets: [
                "Ouvrez la fiche de l'utilisateur.",
                "Modifiez le numéro puis enregistrez.",
                "Demandez à l'utilisateur de se reconnecter pour resynchroniser son compte.",
              ],
            }),
          },
          {
            question:
              "Comment désactiver un accès qui ne doit plus être utilisé ?",
            answerHtml: richAnswer({
              intro:
                "Un accès peut être suspendu pour éviter toute utilisation non souhaitée.",
              bullets: [
                "Ouvrez la fiche du compte concerné.",
                "Appliquez l'état inactif ou retirez les affectations si nécessaire.",
                "Vérifiez ensuite que la personne ne peut plus se connecter.",
              ],
            }),
          },
        ],
      },
      {
        title: "Communication établissement",
        description: "Annonces, ciblage et diffusion des messages.",
        items: [
          {
            question: "Comment publier une annonce à tous les parents ?",
            answerHtml: richAnswer({
              intro:
                "Les annonces globales doivent rester claires et ciblées pour éviter le bruit.",
              bullets: [
                "Choisissez l'audience parents au niveau voulu.",
                "Indiquez la date, le contexte et l'action attendue.",
                "Relisez l'annonce avant publication pour éviter les ambiguïtés.",
              ],
            }),
          },
          {
            question: "Comment limiter un message à une seule classe ?",
            answerHtml: richAnswer({
              intro:
                "Le ciblage par classe permet d'éviter d'informer des familles non concernées.",
              bullets: [
                "Sélectionnez la classe exacte lors de la préparation de l'annonce.",
                "Vérifiez le résumé des destinataires avant validation.",
                "Publiez puis contrôlez l'affichage sur le bon périmètre.",
              ],
            }),
          },
          {
            question: "Comment suivre si une annonce a bien été lue ?",
            answerHtml: richAnswer({
              intro:
                "Selon le module utilisé, des indicateurs de lecture peuvent être disponibles.",
              bullets: [
                "Ouvrez le détail de l'annonce publiée.",
                "Consultez les statuts ou accusés disponibles.",
                "Relancez les destinataires clés si une lecture est attendue rapidement.",
              ],
            }),
          },
        ],
      },
      {
        title: "Pilotage scolaire",
        description: "Supervision quotidienne des modules clés.",
        items: [
          {
            question:
              "Comment vérifier que les notes ont été publiées à temps ?",
            answerHtml: richAnswer({
              intro:
                "Le contrôle se fait en parcourant les classes et périodes concernées.",
              bullets: [
                "Consultez les évaluations par classe et matière.",
                "Repérez les brouillons non publiés proches de la date limite.",
                "Relancez les équipes concernées lorsque nécessaire.",
              ],
            }),
          },
          {
            question: "Comment suivre les absences sur une période ?",
            answerHtml: richAnswer({
              intro:
                "La vue de vie scolaire permet de filtrer les événements par date et type.",
              bullets: [
                "Ouvrez le module Vie scolaire.",
                "Filtrez la période et le type d'événement souhaité.",
                "Exportez ou synthétisez les cas qui nécessitent une action.",
              ],
            }),
          },
          {
            question: "Comment signaler un bug fonctionnel à la plateforme ?",
            answerHtml: richAnswer({
              intro:
                "Le module Assistance permet de centraliser les incidents pour un suivi plus rapide.",
              bullets: [
                "Ouvrez Assistance puis l'onglet Bugs.",
                "Décrivez le problème, le contexte et le résultat attendu.",
                "Ajoutez une capture si cela aide à reproduire l'anomalie.",
              ],
            }),
          },
        ],
      },
    ],
  },
  {
    audience: "STAFF",
    title: "FAQ Personnel École Scolive",
    slug: "faq-personnel-ecole-scolive",
    description:
      "Réponses utiles pour le secrétariat, la vie scolaire et les personnels administratifs.",
    themes: [
      {
        title: "Accueil et dossiers",
        description:
          "Suivi des informations administratives et accueil usagers.",
        items: [
          {
            question: "Comment retrouver rapidement la fiche d'un élève ?",
            answerHtml: richAnswer({
              intro:
                "La recherche utilisateur permet d'ouvrir la bonne fiche sans parcourir toute une liste.",
              bullets: [
                "Cherchez par nom, prénom ou identifiant.",
                "Vérifiez la classe et la date de naissance si plusieurs résultats apparaissent.",
                "Ouvrez la fiche pour consulter les informations utiles.",
              ],
            }),
          },
          {
            question: "Comment mettre à jour une information administrative ?",
            answerHtml: richAnswer({
              intro:
                "Les données modifiables se corrigent directement dans la fiche concernée.",
              bullets: [
                "Ouvrez la rubrique correspondante dans la fiche.",
                "Mettez à jour l'information reçue du parent ou de l'élève.",
                "Enregistrez puis vérifiez l'affichage de la nouvelle valeur.",
              ],
            }),
          },
          {
            question: "Comment gérer une demande de parent au guichet ?",
            answerHtml: richAnswer({
              intro:
                "Le plus efficace est de vérifier le dossier avant de répondre ou d'orienter.",
              bullets: [
                "Identifiez l'élève et le responsable concerné.",
                "Consultez les modules utiles avant de répondre.",
                "Transférez vers le bon service si la demande dépasse votre périmètre.",
              ],
            }),
          },
        ],
      },
      {
        title: "Vie scolaire",
        description: "Suivi opérationnel des événements quotidiens.",
        items: [
          {
            question: "Comment enregistrer un retard ou une absence ?",
            answerHtml: richAnswer({
              intro:
                "Les événements doivent être saisis avec précision pour rester exploitables.",
              bullets: [
                "Choisissez l'élève et le type d'événement.",
                "Saisissez la date, l'heure et la justification connue.",
                "Enregistrez puis contrôlez l'affichage dans la liste.",
              ],
            }),
          },
          {
            question: "Comment suivre les justifications en attente ?",
            answerHtml: richAnswer({
              intro:
                "Les filtres de statut aident à repérer les dossiers non traités.",
              bullets: [
                "Filtrez les événements sur le statut en attente ou non justifié.",
                "Relancez les familles si une action est encore requise.",
                "Mettez à jour le statut dès réception du justificatif.",
              ],
            }),
          },
          {
            question:
              "Comment préparer un point discipline pour la direction ?",
            answerHtml: richAnswer({
              intro:
                "Une synthèse claire facilite la prise de décision par la direction.",
              bullets: [
                "Rassemblez les faits, dates et mesures déjà prises.",
                "Repérez les répétitions sur la période étudiée.",
                "Préparez un résumé court avec les éléments vérifiables.",
              ],
            }),
          },
        ],
      },
      {
        title: "Communication interne",
        description: "Circulation de l'information avec les équipes.",
        items: [
          {
            question:
              "Comment transmettre une information urgente à l'équipe ?",
            answerHtml: richAnswer({
              intro:
                "Le bon canal dépend du niveau d'urgence et du périmètre concerné.",
              bullets: [
                "Utilisez une annonce ou un message ciblé selon la situation.",
                "Rédigez un titre explicite et indiquez l'action attendue.",
                "Confirmez les destinataires avant publication.",
              ],
            }),
          },
          {
            question: "Comment retrouver un message interne ancien ?",
            answerHtml: richAnswer({
              intro:
                "La recherche par mot-clé et le tri par date permettent de retrouver l'historique utile.",
              bullets: [
                "Cherchez un nom, un sujet ou une date approximative.",
                "Ouvrez le fil correspondant.",
                "Archivez les échanges clôturés pour garder une boîte lisible.",
              ],
            }),
          },
          {
            question:
              "Comment signaler un besoin d'évolution de l'application ?",
            answerHtml: richAnswer({
              intro:
                "Les suggestions doivent être remontées dans Assistance pour être qualifiées correctement.",
              bullets: [
                "Décrivez le besoin métier et le bénéfice attendu.",
                "Indiquez le parcours exact concerné.",
                "Ajoutez un exemple concret d'usage si possible.",
              ],
            }),
          },
        ],
      },
    ],
  },
];

const SCHOOL_FAQ_DEFINITIONS = [
  {
    schoolSlug: "college-vogt",
    audience: "PARENT",
    title: "FAQ Parent College Vogt",
    slug: "faq-parent-college-vogt",
    description:
      "Questions fréquentes propres à la vie quotidienne et à l'organisation interne du College Vogt.",
    themes: [
      {
        title: "Cantine et restauration",
        description:
          "Repas, paiement et signalement des particularités alimentaires.",
        items: [
          {
            question:
              "Comment consulter le fonctionnement de la cantine au College Vogt ?",
            answerHtml: richAnswer({
              intro:
                "Les modalités de cantine sont définies par l'établissement et peuvent évoluer selon la période.",
              bullets: [
                "Consultez la rubrique FAQ école pour les horaires de service et les niveaux concernés.",
                "Vérifiez les jours d'inscription et les règles de présence sur la pause de midi.",
                "Contactez l'administration si vous avez besoin d'une précision sur le dispositif en cours.",
              ],
            }),
          },
          {
            question:
              "Comment signaler une allergie ou un régime alimentaire particulier ?",
            answerHtml: richAnswer({
              intro:
                "Les situations alimentaires particulières doivent être remontées directement à l'école avec les justificatifs utiles.",
              bullets: [
                "Prévenez l'administration ou l'équipe de vie scolaire dès que possible.",
                "Joignez le document médical ou les informations demandées par l'établissement.",
                "Vérifiez ensuite avec l'école que le dossier a bien été pris en compte.",
              ],
            }),
          },
          {
            question:
              "À qui s'adresser si mon enfant ne déjeune pas exceptionnellement à la cantine ?",
            answerHtml: richAnswer({
              intro:
                "L'absence ponctuelle à la cantine doit suivre le canal fixé par l'établissement.",
              bullets: [
                "Informez l'école via la messagerie ou le contact administratif indiqué.",
                "Précisez le jour concerné et le motif si cela est demandé.",
                "Vérifiez la confirmation du traitement si l'absence a un impact sur la facturation.",
              ],
            }),
          },
        ],
      },
      {
        title: "Horaires et discipline locale",
        description:
          "Heures d'entrée, ponctualité et cadre interne propre au College Vogt.",
        items: [
          {
            question: "Où retrouver les horaires spécifiques du College Vogt ?",
            answerHtml: richAnswer({
              intro:
                "Les horaires d'entrée, de sortie et certaines particularités de journée dépendent de l'organisation de l'établissement.",
              bullets: [
                "Consultez l'emploi du temps et les communications officielles de l'école.",
                "Vérifiez les ajustements liés aux réunions, examens blancs ou événements spéciaux.",
                "En cas de doute, contactez le secrétariat pour confirmation.",
              ],
            }),
          },
          {
            question: "Comment le College Vogt gère-t-il les retards répétés ?",
            answerHtml: richAnswer({
              intro:
                "Les retards répétés sont suivis localement par la vie scolaire selon les règles de l'établissement.",
              bullets: [
                "Contrôlez les événements enregistrés dans la section Vie scolaire.",
                "Lisez les observations associées lorsqu'elles sont publiées.",
                "Prenez contact avec l'établissement si une mesure d'accompagnement est proposée.",
              ],
            }),
          },
          {
            question:
              "Comment être informé d'un changement d'horaire exceptionnel ?",
            answerHtml: richAnswer({
              intro:
                "Les changements exceptionnels sont généralement relayés par les canaux école de Scolive.",
              bullets: [
                "Surveillez les notifications et les annonces publiées par l'établissement.",
                "Consultez la messagerie pour les consignes ciblées par classe ou niveau.",
                "Vérifiez l'information avant le déplacement si une journée particulière est annoncée.",
              ],
            }),
          },
        ],
      },
      {
        title: "Réunions et suivi parent",
        description:
          "Modalités locales de rencontre avec les équipes du College Vogt.",
        items: [
          {
            question:
              "Comment demander un rendez-vous avec l'équipe éducative du College Vogt ?",
            answerHtml: richAnswer({
              intro:
                "Le rendez-vous parent suit les usages internes de l'établissement et le bon interlocuteur dépend du sujet.",
              bullets: [
                "Utilisez la messagerie Scolive pour adresser une demande claire.",
                "Indiquez la classe, le motif et vos disponibilités.",
                "Si le sujet concerne la vie scolaire, adressez la demande au service concerné plutôt qu'à l'enseignant seul.",
              ],
            }),
          },
          {
            question:
              "Où voir les réunions parents annoncées par le College Vogt ?",
            answerHtml: richAnswer({
              intro:
                "Les réunions spécifiques à l'établissement sont publiées via les annonces et la messagerie école.",
              bullets: [
                "Consultez régulièrement les notifications.",
                "Lisez les annonces établissement ou de classe lorsqu'une réunion est planifiée.",
                "Conservez les messages qui précisent date, heure et lieu.",
              ],
            }),
          },
          {
            question:
              "Comment préparer un échange avec le professeur principal au College Vogt ?",
            answerHtml: richAnswer({
              intro:
                "Un échange préparé permet d'obtenir des réponses concrètes sur la situation de l'élève.",
              bullets: [
                "Listez les matières ou situations à aborder.",
                "Préparez les exemples précis vus dans Notes, Vie scolaire ou Messagerie.",
                "Demandez si nécessaire un plan d'action ou un suivi à date fixe.",
              ],
            }),
          },
        ],
      },
    ],
  },
];

function htmlToText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function upsertFaq({ definition, actorId }) {
  const existing = await prisma.helpFaq.findFirst({
    where: {
      schoolId: null,
      audience: definition.audience,
      slug: definition.slug,
    },
    select: { id: true },
  });

  const data = {
    schoolId: null,
    audience: definition.audience,
    title: definition.title,
    slug: definition.slug || slugify(definition.title),
    description: definition.description,
    status: "PUBLISHED",
    updatedById: actorId,
  };

  if (existing) {
    return prisma.helpFaq.update({ where: { id: existing.id }, data });
  }

  return prisma.helpFaq.create({
    data: {
      ...data,
      createdById: actorId,
    },
  });
}

async function upsertSchoolScopedFaq({ definition, schoolId, actorId }) {
  const existing = await prisma.helpFaq.findFirst({
    where: {
      schoolId,
      audience: definition.audience,
      slug: definition.slug,
    },
    select: { id: true },
  });

  const data = {
    schoolId,
    audience: definition.audience,
    title: definition.title,
    slug: definition.slug || slugify(definition.title),
    description: definition.description,
    status: "PUBLISHED",
    updatedById: actorId,
  };

  if (existing) {
    return prisma.helpFaq.update({ where: { id: existing.id }, data });
  }

  return prisma.helpFaq.create({
    data: {
      ...data,
      createdById: actorId,
    },
  });
}

async function upsertTheme({ faqId, theme, orderIndex, actorId }) {
  const existing = await prisma.helpFaqTheme.findFirst({
    where: { faqId, slug: theme.slug || slugify(theme.title) },
    select: { id: true },
  });

  const data = {
    faqId,
    orderIndex,
    title: theme.title,
    slug: theme.slug || slugify(theme.title),
    description: theme.description,
    status: "PUBLISHED",
    updatedById: actorId,
  };

  if (existing) {
    return prisma.helpFaqTheme.update({ where: { id: existing.id }, data });
  }

  return prisma.helpFaqTheme.create({
    data: {
      ...data,
      createdById: actorId,
    },
  });
}

async function upsertItem({ themeId, item, orderIndex, actorId }) {
  const slug = slugify(item.question);
  const existing = await prisma.helpFaqItem.findFirst({
    where: {
      themeId,
      question: item.question,
    },
    select: { id: true },
  });

  const data = {
    themeId,
    orderIndex,
    question: item.question,
    answerHtml: item.answerHtml,
    answerJson: { html: item.answerHtml, key: slug },
    answerText: htmlToText(item.answerHtml),
    status: "PUBLISHED",
    updatedById: actorId,
  };

  if (existing) {
    return prisma.helpFaqItem.update({ where: { id: existing.id }, data });
  }

  return prisma.helpFaqItem.create({
    data: {
      ...data,
      createdById: actorId,
    },
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refus de seed help-faqs en production.");
  }

  const actor =
    (await prisma.user.findFirst({
      where: {
        platformRoles: {
          some: {},
        },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { createdAt: "asc" },
    })) ||
    (await prisma.user.findFirst({
      select: { id: true, firstName: true, lastName: true },
      orderBy: { createdAt: "asc" },
    }));

  if (!actor) {
    throw new Error(
      "Aucun utilisateur trouvé pour rattacher createdBy/updatedBy sur les FAQs.",
    );
  }

  let faqCount = 0;
  let themeCount = 0;
  let itemCount = 0;

  for (const definition of FAQ_DEFINITIONS) {
    const faq = await upsertFaq({ definition, actorId: actor.id });
    faqCount += 1;

    for (
      let themeIndex = 0;
      themeIndex < definition.themes.length;
      themeIndex += 1
    ) {
      const theme = definition.themes[themeIndex];
      const themeRecord = await upsertTheme({
        faqId: faq.id,
        theme,
        orderIndex: (themeIndex + 1) * 100,
        actorId: actor.id,
      });
      themeCount += 1;

      for (let itemIndex = 0; itemIndex < theme.items.length; itemIndex += 1) {
        const item = theme.items[itemIndex];
        await upsertItem({
          themeId: themeRecord.id,
          item,
          orderIndex: (themeIndex + 1) * 100 + (itemIndex + 1) * 10,
          actorId: actor.id,
        });
        itemCount += 1;
      }
    }
  }

  for (const definition of SCHOOL_FAQ_DEFINITIONS) {
    const school = await prisma.school.findUnique({
      where: { slug: definition.schoolSlug },
      select: { id: true, name: true },
    });
    if (!school) {
      continue;
    }

    const faq = await upsertSchoolScopedFaq({
      definition,
      schoolId: school.id,
      actorId: actor.id,
    });
    faqCount += 1;

    for (
      let themeIndex = 0;
      themeIndex < definition.themes.length;
      themeIndex += 1
    ) {
      const theme = definition.themes[themeIndex];
      const themeRecord = await upsertTheme({
        faqId: faq.id,
        theme,
        orderIndex: (themeIndex + 1) * 100,
        actorId: actor.id,
      });
      themeCount += 1;

      for (let itemIndex = 0; itemIndex < theme.items.length; itemIndex += 1) {
        const item = theme.items[itemIndex];
        await upsertItem({
          themeId: themeRecord.id,
          item,
          orderIndex: (themeIndex + 1) * 100 + (itemIndex + 1) * 10,
          actorId: actor.id,
        });
        itemCount += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        seededBy: `${actor.firstName} ${actor.lastName}`,
        faqs: faqCount,
        themes: themeCount,
        items: itemCount,
        audiences: FAQ_DEFINITIONS.map((entry) => entry.audience),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
