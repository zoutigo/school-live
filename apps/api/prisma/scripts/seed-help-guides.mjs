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

function richHtml({ intro, steps, tips }) {
  const stepsHtml = steps.map((step) => `<li>${step}</li>`).join("");
  const tipsHtml = (tips ?? []).map((tip) => `<li>${tip}</li>`).join("");

  return [
    `<p>${intro}</p>`,
    `<h3>Étapes</h3>`,
    `<ol>${stepsHtml}</ol>`,
    tips?.length ? `<h3>Bonnes pratiques</h3><ul>${tipsHtml}</ul>` : "",
  ].join("");
}

const GUIDE_DEFINITIONS = [
  {
    audience: "PARENT",
    title: "Guide Parent Scolive",
    slug: "guide-parent-scolive",
    description:
      "Suivre la scolarité de votre enfant, communiquer avec l'école et anticiper les échéances.",
    chapters: [
      {
        title: "Messagerie avec l'école",
        slug: "messagerie-ecole-parent",
        summary:
          "Comprendre les échanges avec les enseignants et le personnel scolaire.",
        subchapters: [
          {
            title: "Créer un message au personnel",
            slug: "creer-message-personnel-parent",
            summary:
              "Envoyer un message clair et complet à l'équipe pédagogique.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Depuis l'onglet Messagerie, vous pouvez initier un échange avec un enseignant, un surveillant ou l'administration.",
              steps: [
                "Ouvrir Messagerie puis cliquer sur Nouveau message.",
                "Choisir les destinataires selon le sujet (enseignant principal, vie scolaire, comptabilité).",
                "Rédiger un objet précis puis détailler la demande avec les informations utiles.",
                "Ajouter une pièce jointe si nécessaire (certificat, justificatif, document signé).",
              ],
              tips: [
                "Utiliser un objet explicite: Absence du 12 avril, Demande de rendez-vous, etc.",
                "Vérifier les destinataires avant envoi pour éviter les délais de réponse.",
              ],
            }),
          },
          {
            title: "Retrouver les réponses importantes",
            slug: "retrouver-reponses-messagerie-parent",
            summary:
              "Filtrer et archiver les échanges utiles au suivi scolaire.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "La messagerie contient parfois des décisions importantes (rendez-vous, discipline, échéances).",
              steps: [
                "Utiliser la recherche pour retrouver un message par mot-clé.",
                "Consulter les statuts des messages (lu, non lu, archivé).",
                "Archiver les conversations clôturées afin de garder une boîte claire.",
              ],
              tips: [
                "Conserver les échanges liés aux absences et à la discipline.",
                "Créer une routine hebdomadaire de consultation de la messagerie.",
              ],
            }),
          },
          {
            title: "Tutoriel vidéo: communication efficace",
            slug: "video-communication-efficace-parent",
            summary:
              "Exemple guidé pour rédiger une demande structurée à l'école.",
            contentType: "VIDEO",
            videoUrl: "https://www.youtube.com/embed/5qap5aO4i9A",
          },
        ],
      },
      {
        title: "Suivi des notes et évaluations",
        slug: "suivi-notes-evaluations-parent",
        summary:
          "Analyser les résultats et accompagner la progression de l'enfant.",
        subchapters: [
          {
            title: "Lire les évaluations par matière",
            slug: "lire-evaluations-matiere-parent",
            summary:
              "Interpréter les notes et coefficients dans chaque matière.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "La vue Notes affiche les évaluations publiées, les coefficients et les appréciations enseignants.",
              steps: [
                "Sélectionner la période (trimestre/semestre).",
                "Comparer les notes par matière et repérer les écarts.",
                "Lire les commentaires de l'enseignant pour comprendre les axes d'amélioration.",
              ],
              tips: [
                "Identifier rapidement les matières en baisse sur deux périodes successives.",
              ],
            }),
          },
          {
            title: "Suivre les tendances sur le trimestre",
            slug: "suivre-tendances-trimestre-parent",
            summary: "Détecter les progrès ou difficultés persistantes.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les tendances vous aident à anticiper les besoins de soutien avant la fin de période.",
              steps: [
                "Consulter l'évolution des moyennes par matière.",
                "Croiser les résultats avec les absences et retards.",
                "Programmer un échange avec l'enseignant si une baisse continue est observée.",
              ],
            }),
          },
          {
            title: "Préparer un rendez-vous pédagogique",
            slug: "preparer-rendez-vous-pedagogique-parent",
            summary:
              "Structurer les questions à poser lors d'un entretien parent-enseignant.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Un rendez-vous bien préparé permet d'obtenir un plan d'action concret pour l'élève.",
              steps: [
                "Lister les matières prioritaires et exemples de difficultés.",
                "Demander des objectifs mesurables pour la prochaine période.",
                "Convenir d'un point de suivi à date fixe.",
              ],
            }),
          },
        ],
      },
      {
        title: "Vie scolaire et discipline",
        slug: "vie-scolaire-discipline-parent",
        summary:
          "Consulter les incidents, absences et actions de régularisation.",
        subchapters: [
          {
            title: "Consulter les absences et retards",
            slug: "consulter-absences-retards-parent",
            summary:
              "Suivre la ponctualité et justifier rapidement les événements.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "La section Vie scolaire regroupe absences, retards et justifications associées.",
              steps: [
                "Ouvrir Vie scolaire puis filtrer par type d'événement.",
                "Vérifier les dates, créneaux et statuts de justification.",
                "Transmettre un justificatif quand l'événement est marqué non justifié.",
              ],
            }),
          },
          {
            title: "Lire les sanctions et observations",
            slug: "lire-sanctions-observations-parent",
            summary: "Comprendre le contexte de chaque décision disciplinaire.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Chaque sanction inclut un motif, une date et éventuellement une mesure d'accompagnement.",
              steps: [
                "Consulter le détail de la sanction et le commentaire associé.",
                "Identifier les actions demandées à la famille.",
                "Contacter la vie scolaire en cas de besoin de clarification.",
              ],
            }),
          },
          {
            title: "Valider les actions demandées",
            slug: "valider-actions-discipline-parent",
            summary:
              "Traiter les demandes de la vie scolaire dans les délais attendus.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Certaines situations nécessitent un accusé de lecture, une confirmation ou l'envoi d'un document.",
              steps: [
                "Repérer les demandes en attente dans la fiche discipline.",
                "Soumettre la réponse et les pièces demandées.",
                "Vérifier la mise à jour du statut après traitement.",
              ],
            }),
          },
        ],
      },
    ],
  },
  {
    audience: "STUDENT",
    title: "Guide Élève Scolive",
    slug: "guide-eleve-scolive",
    description:
      "Organiser son travail, suivre son emploi du temps et communiquer correctement avec l'équipe éducative.",
    chapters: [
      {
        title: "Organisation du travail",
        slug: "organisation-travail-eleve",
        summary: "Planifier ses tâches et prioriser les devoirs.",
        subchapters: [
          {
            title: "Planifier la semaine avec l'agenda",
            slug: "planifier-semaine-agenda-eleve",
            summary: "Construire une routine de travail régulière.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "L'agenda centralise cours, devoirs et échéances importantes.",
              steps: [
                "Consulter les cours de la semaine depuis l'emploi du temps.",
                "Ajouter les devoirs et échéances dès qu'ils sont annoncés.",
                "Répartir les révisions en sessions courtes avant la date d'évaluation.",
              ],
            }),
          },
          {
            title: "Prioriser les devoirs urgents",
            slug: "prioriser-devoirs-urgents-eleve",
            summary: "Éviter les retards et améliorer la régularité.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "En priorisant les tâches, vous réduisez la pression de dernière minute.",
              steps: [
                "Classer les devoirs par date limite et difficulté.",
                "Commencer par les matières à coefficient élevé.",
                "Prévoir une vérification finale avant envoi ou remise.",
              ],
            }),
          },
          {
            title: "Tutoriel vidéo: méthode de révision",
            slug: "video-methode-revision-eleve",
            summary:
              "Exemple de séance de révision efficace avant une évaluation.",
            contentType: "VIDEO",
            videoUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
          },
        ],
      },
      {
        title: "Suivi des résultats",
        slug: "suivi-resultats-eleve",
        summary: "Lire ses évaluations et progresser matière par matière.",
        subchapters: [
          {
            title: "Comprendre ses notes",
            slug: "comprendre-notes-eleve",
            summary: "Analyser les coefficients et les commentaires.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Une note se lit avec son coefficient et le commentaire associé.",
              steps: [
                "Ouvrir Notes et sélectionner la période en cours.",
                "Repérer les évaluations faibles et leurs causes.",
                "Noter les conseils de l'enseignant pour la prochaine fois.",
              ],
            }),
          },
          {
            title: "Fixer des objectifs de progression",
            slug: "fixer-objectifs-progression-eleve",
            summary: "Transformer les retours enseignants en plan d'action.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Des objectifs simples et mesurables aident à progresser rapidement.",
              steps: [
                "Choisir deux matières prioritaires pour le mois.",
                "Définir un objectif concret par matière.",
                "Évaluer les progrès après chaque devoir.",
              ],
            }),
          },
          {
            title: "Demander de l'aide à temps",
            slug: "demander-aide-a-temps-eleve",
            summary: "Utiliser la messagerie pour poser des questions ciblées.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Poser une question précise évite les blocages avant les contrôles.",
              steps: [
                "Décrire le chapitre ou exercice concerné.",
                "Indiquer ce qui est compris et ce qui bloque.",
                "Demander un exemple ou une ressource complémentaire.",
              ],
            }),
          },
        ],
      },
      {
        title: "Vie scolaire",
        slug: "vie-scolaire-eleve",
        summary:
          "Être ponctuel, respecter le cadre et suivre les notifications.",
        subchapters: [
          {
            title: "Suivre les absences et retards",
            slug: "suivre-absences-retards-eleve",
            summary:
              "Vérifier sa situation et éviter les incidents répétitifs.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "La section vie scolaire vous permet de suivre vos retards et absences.",
              steps: [
                "Consulter la liste des événements enregistrés.",
                "Identifier les jours ou créneaux les plus sensibles.",
                "Ajuster votre organisation quotidienne.",
              ],
            }),
          },
          {
            title: "Lire les notifications importantes",
            slug: "lire-notifications-importantes-eleve",
            summary:
              "Ne pas manquer une information de classe ou d'établissement.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les notifications vous alertent sur les changements de planning et rappels.",
              steps: [
                "Ouvrir les notifications chaque jour.",
                "Marquer comme lues les informations traitées.",
                "Conserver les annonces utiles en favori ou capture.",
              ],
            }),
          },
          {
            title: "Adopter les bonnes pratiques numériques",
            slug: "bonnes-pratiques-numeriques-eleve",
            summary: "Utiliser l'application avec responsabilité et respect.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Le respect numérique est essentiel pour des échanges productifs.",
              steps: [
                "Utiliser un ton respectueux dans la messagerie.",
                "Ne pas partager vos accès avec d'autres élèves.",
                "Signaler un bug ou contenu inapproprié via Assistance.",
              ],
            }),
          },
        ],
      },
    ],
  },
  {
    audience: "TEACHER",
    title: "Guide Enseignant Scolive",
    slug: "guide-enseignant-scolive",
    description:
      "Piloter la classe, publier des contenus et suivre les performances des élèves.",
    chapters: [
      {
        title: "Gestion pédagogique",
        slug: "gestion-pedagogique-enseignant",
        summary: "Structurer les évaluations et suivre les acquis.",
        subchapters: [
          {
            title: "Créer une évaluation",
            slug: "creer-evaluation-enseignant",
            summary: "Paramétrer une évaluation claire et exploitable.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Le module Notes permet de créer rapidement des évaluations par classe et matière.",
              steps: [
                "Sélectionner classe, matière et période.",
                "Définir le titre, la date, le barème et le coefficient.",
                "Publier ou conserver en brouillon selon le calendrier pédagogique.",
              ],
            }),
          },
          {
            title: "Saisir et publier les notes",
            slug: "saisir-publier-notes-enseignant",
            summary:
              "Fiabiliser la saisie et partager les résultats aux familles.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Une saisie rigoureuse des notes améliore la confiance et la réactivité des familles.",
              steps: [
                "Saisir les notes élève par élève.",
                "Vérifier les absences/excusés avant publication.",
                "Publier les résultats et surveiller les retours.",
              ],
            }),
          },
          {
            title: "Tutoriel vidéo: correction rapide",
            slug: "video-correction-rapide-enseignant",
            summary:
              "Démonstration d'un flux de correction et publication en quelques minutes.",
            contentType: "VIDEO",
            videoUrl: "https://www.youtube.com/embed/21X5lGlDOfg",
          },
        ],
      },
      {
        title: "Communication avec les familles",
        slug: "communication-familles-enseignant",
        summary: "Maintenir un lien clair avec les parents et la direction.",
        subchapters: [
          {
            title: "Envoyer une information de classe",
            slug: "envoyer-info-classe-enseignant",
            summary:
              "Diffuser une communication utile à tous les parents concernés.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les annonces de classe évitent les malentendus et harmonisent les consignes.",
              steps: [
                "Rédiger un message concis avec date et consignes.",
                "Choisir la bonne audience (classe, niveau, parents uniquement).",
                "Valider la publication et suivre les accusés de lecture.",
              ],
            }),
          },
          {
            title: "Répondre aux messages sensibles",
            slug: "repondre-messages-sensibles-enseignant",
            summary: "Gérer les échanges délicats de manière professionnelle.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Certains échanges exigent un cadre précis et des formulations factuelles.",
              steps: [
                "Reprendre les faits observables sans jugement.",
                "Proposer une action concrète ou rendez-vous.",
                "Mettre en copie la direction si nécessaire.",
              ],
            }),
          },
          {
            title: "Documenter les échanges clés",
            slug: "documenter-echanges-cles-enseignant",
            summary: "Conserver une traçabilité des décisions pédagogiques.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Une bonne traçabilité facilite les suivis en conseil de classe.",
              steps: [
                "Archiver les fils de discussion clôturés.",
                "Associer les échanges aux situations disciplinaires si besoin.",
                "Préparer des synthèses pour les réunions d'équipe.",
              ],
            }),
          },
        ],
      },
      {
        title: "Organisation de classe",
        slug: "organisation-classe-enseignant",
        summary: "Coordonner emploi du temps, devoirs et événements de classe.",
        subchapters: [
          {
            title: "Mettre à jour le cahier de texte",
            slug: "mettre-a-jour-cahier-texte-enseignant",
            summary: "Publier les devoirs et ressources au bon moment.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Le cahier de texte numérique évite les oublis côté élèves et parents.",
              steps: [
                "Ajouter l'objectif de séance et les travaux demandés.",
                "Préciser les échéances et critères attendus.",
                "Joindre les supports utiles (PDF, image, lien).",
              ],
            }),
          },
          {
            title: "Gérer les changements de séance",
            slug: "gerer-changements-seance-enseignant",
            summary: "Informer rapidement en cas d'ajustement de planning.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "En cas de modification de cours, la communication rapide limite les perturbations.",
              steps: [
                "Mettre à jour l'emploi du temps de la classe.",
                "Notifier les élèves et parents concernés.",
                "Confirmer les alternatives (travail en autonomie, report).",
              ],
            }),
          },
          {
            title: "Préparer le conseil de classe",
            slug: "preparer-conseil-classe-enseignant",
            summary:
              "Assembler les éléments utiles pour la réunion de période.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Le conseil de classe repose sur des données fiables et synthétiques.",
              steps: [
                "Compiler les moyennes et observations par élève.",
                "Identifier les cas prioritaires à discuter.",
                "Renseigner les décisions dans le module prévu.",
              ],
            }),
          },
        ],
      },
    ],
  },
  {
    audience: "STAFF",
    title: "Guide Personnel École Scolive",
    slug: "guide-personnel-ecole-scolive",
    description:
      "Traiter les opérations administratives, disciplinaires et de support quotidien.",
    chapters: [
      {
        title: "Traitement quotidien des demandes",
        slug: "traitement-demandes-personnel",
        summary:
          "Organiser les tâches administratives et les tickets entrants.",
        subchapters: [
          {
            title: "Trier les tickets d'assistance",
            slug: "trier-tickets-assistance-personnel",
            summary:
              "Prioriser les incidents bloquants et assigner les actions.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Le module Assistance centralise les remontées de bugs et suggestions des utilisateurs.",
              steps: [
                "Filtrer les tickets par statut et type.",
                "Identifier les incidents critiques (connexion, accès notes, paiement).",
                "Documenter la réponse apportée et changer le statut.",
              ],
            }),
          },
          {
            title: "Répondre avec un niveau de service clair",
            slug: "repondre-niveau-service-personnel",
            summary: "Formuler des réponses actionnables et traçables.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Une réponse structurée réduit les allers-retours et augmente la satisfaction.",
              steps: [
                "Confirmer la réception avec un délai estimé.",
                "Décrire les vérifications effectuées.",
                "Indiquer la prochaine étape et la date de suivi.",
              ],
            }),
          },
          {
            title: "Tutoriel vidéo: escalade d'incident",
            slug: "video-escalade-incident-personnel",
            summary:
              "Quand et comment escalader un ticket au support plateforme.",
            contentType: "VIDEO",
            videoUrl: "https://www.youtube.com/embed/XfR9iY5y94s",
          },
        ],
      },
      {
        title: "Vie scolaire opérationnelle",
        slug: "vie-scolaire-operationnelle-personnel",
        summary: "Suivre absences, retards et incidents de discipline.",
        subchapters: [
          {
            title: "Enregistrer une absence",
            slug: "enregistrer-absence-personnel",
            summary: "Tracer correctement l'événement et son justificatif.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Une absence correctement enregistrée évite les incohérences sur les bulletins et alertes parents.",
              steps: [
                "Sélectionner l'élève et le créneau concerné.",
                "Renseigner le motif et le statut de justification.",
                "Notifier le parent si un document est requis.",
              ],
            }),
          },
          {
            title: "Gérer les retards récurrents",
            slug: "gerer-retards-recurrents-personnel",
            summary: "Mettre en place un suivi progressif avec les familles.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les retards répétés doivent être suivis avec méthode pour éviter l'aggravation.",
              steps: [
                "Repérer les élèves avec répétition d'incidents.",
                "Déclencher les notifications parentales prévues.",
                "Préparer un point de suivi avec le responsable de vie scolaire.",
              ],
            }),
          },
          {
            title: "Tracer une sanction",
            slug: "tracer-sanction-personnel",
            summary:
              "Saisir la sanction et les actions attendues de la famille.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "La sanction doit être précise, datée et accompagnée des suites prévues.",
              steps: [
                "Sélectionner la catégorie de sanction.",
                "Décrire brièvement les faits constatés.",
                "Indiquer l'action de régularisation et le responsable du suivi.",
              ],
            }),
          },
        ],
      },
      {
        title: "Qualité des données scolaires",
        slug: "qualite-donnees-scolaires-personnel",
        summary: "Maintenir des données fiables pour tous les modules.",
        subchapters: [
          {
            title: "Vérifier les profils utilisateurs",
            slug: "verifier-profils-utilisateurs-personnel",
            summary: "Contrôler les informations critiques de chaque compte.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Des profils complets réduisent les incidents d'accès et les erreurs de communication.",
              steps: [
                "Contrôler email, téléphone et statut d'activation.",
                "Vérifier l'affectation des rôles école.",
                "Corriger les données manquantes avec l'utilisateur concerné.",
              ],
            }),
          },
          {
            title: "Corriger les incohérences d'affectation",
            slug: "corriger-incoherences-affectation-personnel",
            summary:
              "Réaligner élèves, classes et matières après modifications.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Après des changements d'effectifs, certaines affectations peuvent devenir incohérentes.",
              steps: [
                "Lister les élèves sans classe active.",
                "Vérifier les affectations enseignants-matières.",
                "Valider les corrections avec l'administration académique.",
              ],
            }),
          },
          {
            title: "Préparer un export de contrôle",
            slug: "preparer-export-controle-personnel",
            summary: "Produire une extraction claire pour audit interne.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les exports de contrôle facilitent les revues de conformité et de qualité.",
              steps: [
                "Sélectionner le module concerné (users, discipline, notes, finance).",
                "Choisir la période et les filtres pertinents.",
                "Documenter les anomalies détectées et les corrections prévues.",
              ],
            }),
          },
        ],
      },
    ],
  },
  {
    audience: "SCHOOL_ADMIN",
    title: "Guide Administration École Scolive",
    slug: "guide-administration-ecole-scolive",
    description:
      "Piloter les opérations établissement, la gouvernance des comptes et le suivi financier.",
    chapters: [
      {
        title: "Pilotage académique",
        slug: "pilotage-academique-admin-ecole",
        summary: "Superviser classes, programmes et indicateurs pédagogiques.",
        subchapters: [
          {
            title: "Structurer les classes de l'année",
            slug: "structurer-classes-annee-admin-ecole",
            summary: "Créer et maintenir les classes avec leurs référents.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Une structure de classes claire est la base de tous les modules pédagogiques.",
              steps: [
                "Créer les classes par niveau et filière.",
                "Affecter les enseignants référents.",
                "Vérifier les effectifs et les correspondances d'emploi du temps.",
              ],
            }),
          },
          {
            title: "Affecter enseignants et matières",
            slug: "affecter-enseignants-matieres-admin-ecole",
            summary: "Garantir la cohérence des enseignements par classe.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les affectations déterminent les droits d'édition sur notes, emplois du temps et devoirs.",
              steps: [
                "Associer chaque matière à un enseignant principal.",
                "Contrôler les éventuelles co-interventions.",
                "Valider les impacts sur les modules notes et timetable.",
              ],
            }),
          },
          {
            title: "Tutoriel vidéo: revue trimestrielle",
            slug: "video-revue-trimestrielle-admin-ecole",
            summary: "Exemple de revue des indicateurs en comité de direction.",
            contentType: "VIDEO",
            videoUrl: "https://www.youtube.com/embed/2OEL4P1Rz04",
          },
        ],
      },
      {
        title: "Gouvernance des accès",
        slug: "gouvernance-acces-admin-ecole",
        summary:
          "Maîtriser les rôles, permissions et cycles de vie des comptes.",
        subchapters: [
          {
            title: "Créer un compte personnel école",
            slug: "creer-compte-personnel-admin-ecole",
            summary: "Attribuer le bon rôle dès la création de compte.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Chaque nouveau compte doit être configuré avec le rôle adéquat pour éviter les accès excessifs.",
              steps: [
                "Renseigner identité, email et téléphone.",
                "Attribuer le rôle (staff, comptable, superviseur, etc.).",
                "Vérifier l'activation et la complétude du profil.",
              ],
            }),
          },
          {
            title: "Réviser les droits sensibles",
            slug: "reviser-droits-sensibles-admin-ecole",
            summary: "Sécuriser les modules notes, discipline et finance.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Une revue périodique des droits limite les risques opérationnels.",
              steps: [
                "Lister les utilisateurs avec droits d'administration.",
                "Retirer les accès non justifiés ou obsolètes.",
                "Conserver une trace des changements effectués.",
              ],
            }),
          },
          {
            title: "Gérer les comptes inactifs",
            slug: "gerer-comptes-inactifs-admin-ecole",
            summary: "Maintenir un parc utilisateur propre et sécurisé.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les comptes non utilisés doivent être désactivés ou archivés selon la politique interne.",
              steps: [
                "Identifier les comptes sans activité récente.",
                "Vérifier la situation RH ou scolaire associée.",
                "Suspendre ou clôturer le compte après validation.",
              ],
            }),
          },
        ],
      },
      {
        title: "Suivi financier et opérations",
        slug: "suivi-financier-operations-admin-ecole",
        summary: "Suivre paiements, impayés et communication financière.",
        subchapters: [
          {
            title: "Contrôler les factures émises",
            slug: "controler-factures-emises-admin-ecole",
            summary: "Vérifier la cohérence des montants et échéances.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Le contrôle des factures réduit les litiges et accélère le recouvrement.",
              steps: [
                "Vérifier les périodes de facturation et tarifs appliqués.",
                "Comparer les montants dus et montants réglés.",
                "Signaler immédiatement les anomalies au service comptable.",
              ],
            }),
          },
          {
            title: "Relancer les impayés",
            slug: "relancer-impayes-admin-ecole",
            summary: "Déployer un processus de relance progressif et traçable.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Une relance structurée améliore le taux de recouvrement tout en gardant une communication respectueuse.",
              steps: [
                "Segmenter les impayés par ancienneté.",
                "Envoyer les relances avec échéance claire.",
                "Programmer les escalades internes en cas d'absence de retour.",
              ],
            }),
          },
          {
            title: "Partager un point financier mensuel",
            slug: "point-financier-mensuel-admin-ecole",
            summary: "Communiquer les indicateurs clés à la direction.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Un reporting mensuel régulier aide la direction à piloter les décisions budgétaires.",
              steps: [
                "Extraire les indicateurs de paiements et d'impayés.",
                "Mettre en évidence les écarts vs mois précédent.",
                "Proposer les actions correctives prioritaires.",
              ],
            }),
          },
        ],
      },
    ],
  },
];

const SCHOOL_GUIDE_DEFINITIONS = [
  {
    schoolName: "College Vogt",
    audience: "PARENT",
    title: "Guide Parent College Vogt",
    slug: "guide-parent-college-vogt",
    description:
      "Comprendre les procédures internes du College Vogt: restauration, accès, réunions et suivi local.",
    chapters: [
      {
        title: "Cantine et restauration",
        slug: "cantine-restauration-vogt-parent",
        summary:
          "Réserver, signaler un régime et suivre les changements de service.",
        subchapters: [
          {
            title: "Consulter les modalités de cantine",
            slug: "modalites-cantine-vogt-parent",
            summary: "Identifier les horaires, tarifs et conditions d'accès.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Le College Vogt communique les modalités de restauration par période.",
              steps: [
                "Ouvrir Assistance puis le guide de votre école.",
                "Vérifier les créneaux de service et les classes concernées.",
                "Consulter les informations tarifaires et les cas particuliers.",
              ],
            }),
          },
          {
            title: "Déclarer un régime alimentaire",
            slug: "regime-alimentaire-vogt-parent",
            summary:
              "Transmettre les besoins alimentaires spécifiques de l'enfant.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les restrictions alimentaires doivent être remontées avec justificatif si nécessaire.",
              steps: [
                "Préparer le document ou certificat utile.",
                "Envoyer l'information à la vie scolaire ou au service concerné.",
                "Vérifier la prise en compte avant la reprise des repas.",
              ],
            }),
          },
          {
            title: "Suivre les jours sans cantine",
            slug: "jours-sans-cantine-vogt-parent",
            summary: "Anticiper les jours où un repas externe doit être prévu.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Certaines journées particulières modifient le fonctionnement habituel.",
              steps: [
                "Consulter les annonces publiées par l'école.",
                "Prévoir un repas alternatif si besoin.",
                "Informer l'élève de l'organisation du jour concerné.",
              ],
            }),
          },
        ],
      },
      {
        title: "Accès et sorties",
        slug: "acces-sorties-vogt-parent",
        summary:
          "Suivre les règles d'entrée, de sortie et de récupération des élèves.",
        subchapters: [
          {
            title: "Horaires d'accès au portail",
            slug: "horaires-portail-vogt-parent",
            summary: "Vérifier les plages d'entrée et de sortie par niveau.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les horaires d'accès peuvent différer selon les cycles et événements.",
              steps: [
                "Consulter les horaires communiqués pour votre niveau.",
                "Respecter les créneaux recommandés pour éviter les retards.",
                "Prévoir une marge en période de forte affluence.",
              ],
            }),
          },
          {
            title: "Autoriser une sortie exceptionnelle",
            slug: "sortie-exceptionnelle-vogt-parent",
            summary: "Formaliser une demande de sortie anticipée.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Toute sortie anticipée doit être signalée et validée selon la procédure interne.",
              steps: [
                "Informer l'école via la messagerie ou le canal indiqué.",
                "Préciser l'heure, le motif et l'identité de l'accompagnant.",
                "Attendre la confirmation avant de vous présenter au portail.",
              ],
            }),
          },
          {
            title: "Gestion des retards au portail",
            slug: "retards-portail-vogt-parent",
            summary:
              "Réagir correctement lorsqu'un élève arrive après le début des cours.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les retards répétés nécessitent souvent une justification formalisée.",
              steps: [
                "Signaler le retard dès que possible.",
                "Présenter le justificatif si demandé.",
                "Suivre l'historique des retards dans la vie scolaire.",
              ],
            }),
          },
        ],
      },
      {
        title: "Réunions et communication locale",
        slug: "reunions-communication-vogt-parent",
        summary:
          "Préparer les réunions parents et suivre les annonces propres à l'établissement.",
        subchapters: [
          {
            title: "Consulter les dates de réunion",
            slug: "dates-reunion-vogt-parent",
            summary:
              "Identifier les réunions importantes par classe ou niveau.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Le calendrier des réunions est communiqué selon les périodes pédagogiques.",
              steps: [
                "Consulter les annonces école.",
                "Noter les dates utiles dans votre agenda.",
                "Préparer vos questions avant la rencontre.",
              ],
            }),
          },
          {
            title: "Préparer un échange avec la direction",
            slug: "echange-direction-vogt-parent",
            summary: "Arriver avec une demande claire et documentée.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Une demande structurée facilite le traitement par la direction.",
              steps: [
                "Résumer les faits et la période concernée.",
                "Joindre les pièces ou références utiles.",
                "Proposer un objectif clair pour l'entretien.",
              ],
            }),
          },
          {
            title: "Suivre les annonces de l'établissement",
            slug: "annonces-etablissement-vogt-parent",
            summary: "Rester informé des changements d'organisation locaux.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les annonces école complètent les informations purement plateforme.",
              steps: [
                "Consulter régulièrement le fil et l'assistance école.",
                "Vérifier les changements de planning ou d'accès.",
                "Relayer les informations importantes à votre enfant.",
              ],
            }),
          },
        ],
      },
    ],
  },
  {
    schoolName: "College Vogt",
    audience: "TEACHER",
    title: "Guide Enseignant College Vogt",
    slug: "guide-enseignant-college-vogt",
    description:
      "Procédures internes du College Vogt pour la discipline, les réunions et l'organisation pédagogique locale.",
    chapters: [
      {
        title: "Vie scolaire locale",
        slug: "vie-scolaire-locale-vogt-teacher",
        summary: "Coordonner les signalements et actions avec la vie scolaire.",
        subchapters: [
          {
            title: "Déclarer un incident de classe",
            slug: "incident-classe-vogt-teacher",
            summary:
              "Formaliser un incident avec les bons éléments de contexte.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Le College Vogt attend des signalements précis et exploitables.",
              steps: [
                "Documenter le fait, l'heure et les élèves concernés.",
                "Qualifier le niveau de gravité.",
                "Transmettre au service compétent selon la procédure interne.",
              ],
            }),
          },
          {
            title: "Coordonner avec le surveillant référent",
            slug: "surveillant-referent-vogt-teacher",
            summary: "Fluidifier la prise en charge d'un élève signalé.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "La coordination rapide réduit les incompréhensions et les doublons.",
              steps: [
                "Identifier le référent de la zone ou du niveau.",
                "Partager les faits utiles de manière concise.",
                "Convenir d'une action et d'un suivi.",
              ],
            }),
          },
          {
            title: "Préparer un compte rendu disciplinaire",
            slug: "compte-rendu-disciplinaire-vogt-teacher",
            summary: "Rédiger un retour exploitable par la hiérarchie.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Un bon compte rendu doit rester factuel, daté et actionnable.",
              steps: [
                "Structurer le récit des faits.",
                "Éviter les formulations ambiguës.",
                "Conclure par les suites proposées.",
              ],
            }),
          },
        ],
      },
      {
        title: "Réunions pédagogiques",
        slug: "reunions-pedagogiques-vogt-teacher",
        summary: "Préparer les échanges d'équipe et consolider les décisions.",
        subchapters: [
          {
            title: "Préparer le conseil de classe local",
            slug: "conseil-classe-vogt-teacher",
            summary: "Arriver avec les informations utiles et partagées.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Le conseil de classe demande une préparation homogène entre enseignants.",
              steps: [
                "Vérifier les notes et appréciations saisies.",
                "Signaler les cas sensibles à l'avance.",
                "Préparer des recommandations concrètes.",
              ],
            }),
          },
          {
            title: "Synthétiser les décisions prises",
            slug: "synthese-decisions-vogt-teacher",
            summary: "Diffuser une synthèse claire après réunion.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro: "Une synthèse claire facilite l'exécution des décisions.",
              steps: [
                "Lister les décisions par thème ou par classe.",
                "Attribuer les responsabilités.",
                "Rappeler les échéances convenues.",
              ],
            }),
          },
          {
            title: "Planifier les suivis d'équipe",
            slug: "suivis-equipe-vogt-teacher",
            summary: "Ne pas laisser les actions décidées sans propriétaire.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Le suivi post-réunion fait partie intégrante de l'efficacité collective.",
              steps: [
                "Programmer les points de contrôle.",
                "Mettre à jour les avancements.",
                "Alerter tôt en cas de blocage.",
              ],
            }),
          },
        ],
      },
      {
        title: "Organisation interne",
        slug: "organisation-interne-vogt-teacher",
        summary:
          "S'aligner sur les pratiques locales de communication et de planning.",
        subchapters: [
          {
            title: "Utiliser les circuits de communication interne",
            slug: "circuits-communication-vogt-teacher",
            summary:
              "Savoir quand utiliser la messagerie, les annonces ou l'escalade directe.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro: "Chaque type d'information a son canal recommandé.",
              steps: [
                "Identifier si l'information est urgente, pédagogique ou administrative.",
                "Choisir le bon canal de diffusion.",
                "Conserver une trace si nécessaire.",
              ],
            }),
          },
          {
            title: "Gérer un changement de salle",
            slug: "changement-salle-vogt-teacher",
            summary: "Informer rapidement les parties concernées.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les changements de salle doivent être communiqués tôt pour éviter les pertes de temps.",
              steps: [
                "Vérifier la disponibilité de la salle.",
                "Informer les élèves et les collègues concernés.",
                "Mettre à jour le planning si le circuit le prévoit.",
              ],
            }),
          },
          {
            title: "Préparer une évaluation commune",
            slug: "evaluation-commune-vogt-teacher",
            summary: "Coordonner les contenus et dates au niveau local.",
            contentType: "RICH_TEXT",
            contentHtml: richHtml({
              intro:
                "Les évaluations communes demandent un alignement entre enseignants du niveau.",
              steps: [
                "Valider le périmètre avec l'équipe.",
                "Fixer une date compatible avec le planning local.",
                "Partager les critères d'évaluation retenus.",
              ],
            }),
          },
        ],
      },
    ],
  },
];

async function upsertGuide({ definition, actorId }) {
  const existing = await prisma.helpGuide.findFirst({
    where: {
      schoolId: null,
      audience: definition.audience,
      slug: definition.slug,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.helpGuide.update({
      where: { id: existing.id },
      data: {
        title: definition.title,
        description: definition.description,
        status: "PUBLISHED",
        updatedById: actorId,
      },
    });
  }

  return prisma.helpGuide.create({
    data: {
      schoolId: null,
      audience: definition.audience,
      title: definition.title,
      slug: definition.slug,
      description: definition.description,
      status: "PUBLISHED",
      createdById: actorId,
      updatedById: actorId,
    },
  });
}

async function upsertSchoolGuide({ definition, actorId }) {
  const school = await prisma.school.findFirst({
    where: { name: definition.schoolName },
    select: { id: true },
  });
  if (!school) return null;

  const existing = await prisma.helpGuide.findFirst({
    where: {
      schoolId: school.id,
      audience: definition.audience,
      slug: definition.slug,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.helpGuide.update({
      where: { id: existing.id },
      data: {
        title: definition.title,
        description: definition.description,
        status: "PUBLISHED",
        updatedById: actorId,
      },
    });
  }

  return prisma.helpGuide.create({
    data: {
      schoolId: school.id,
      audience: definition.audience,
      title: definition.title,
      slug: definition.slug,
      description: definition.description,
      status: "PUBLISHED",
      createdById: actorId,
      updatedById: actorId,
    },
  });
}

async function upsertChapter({ guideId, actorId, payload }) {
  const existing = await prisma.helpChapter.findFirst({
    where: {
      guideId,
      slug: payload.slug,
    },
    select: { id: true },
  });

  const data = {
    guideId,
    parentId: payload.parentId ?? null,
    orderIndex: payload.orderIndex,
    title: payload.title,
    slug: payload.slug,
    summary: payload.summary,
    contentType: payload.contentType,
    contentHtml:
      payload.contentType === "RICH_TEXT" ? payload.contentHtml : null,
    contentJson:
      payload.contentType === "RICH_TEXT"
        ? { html: payload.contentHtml }
        : null,
    videoUrl: payload.contentType === "VIDEO" ? payload.videoUrl : null,
    contentText:
      payload.contentType === "RICH_TEXT"
        ? payload.contentHtml
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        : "",
    status: "PUBLISHED",
    updatedById: actorId,
  };

  if (existing) {
    return prisma.helpChapter.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.helpChapter.create({
    data: {
      ...data,
      createdById: actorId,
    },
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refus de seed help-guides en production.");
  }

  const actor =
    (await prisma.user.findFirst({
      where: {
        platformRoles: {
          some: {
            role: {
              in: ["SUPER_ADMIN", "ADMIN"],
            },
          },
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
      "Aucun utilisateur trouvé pour rattacher createdBy/updatedBy sur les guides.",
    );
  }

  let guidesCount = 0;
  let chaptersCount = 0;
  let subchaptersCount = 0;

  for (const definition of GUIDE_DEFINITIONS) {
    const guide = await upsertGuide({ definition, actorId: actor.id });
    guidesCount += 1;

    for (let index = 0; index < definition.chapters.length; index += 1) {
      const chapter = definition.chapters[index];
      const chapterRecord = await upsertChapter({
        guideId: guide.id,
        actorId: actor.id,
        payload: {
          parentId: null,
          orderIndex: (index + 1) * 100,
          title: chapter.title,
          slug: chapter.slug || slugify(chapter.title),
          summary: chapter.summary,
          contentType: "RICH_TEXT",
          contentHtml: richHtml({
            intro: chapter.summary,
            steps: [
              "Accéder au module concerné depuis le menu principal.",
              "Appliquer le flux recommandé et vérifier le résultat.",
              "Utiliser Assistance en cas de blocage technique ou fonctionnel.",
            ],
          }),
        },
      });
      chaptersCount += 1;

      for (
        let subIndex = 0;
        subIndex < chapter.subchapters.length;
        subIndex += 1
      ) {
        const sub = chapter.subchapters[subIndex];
        await upsertChapter({
          guideId: guide.id,
          actorId: actor.id,
          payload: {
            parentId: chapterRecord.id,
            orderIndex: (index + 1) * 100 + (subIndex + 1) * 10,
            title: sub.title,
            slug: sub.slug || slugify(sub.title),
            summary: sub.summary,
            contentType: sub.contentType,
            contentHtml: sub.contentHtml,
            videoUrl: sub.videoUrl,
          },
        });
        subchaptersCount += 1;
      }
    }
  }

  for (const definition of SCHOOL_GUIDE_DEFINITIONS) {
    const guide = await upsertSchoolGuide({ definition, actorId: actor.id });
    if (!guide) continue;
    guidesCount += 1;

    for (let index = 0; index < definition.chapters.length; index += 1) {
      const chapter = definition.chapters[index];
      const chapterRecord = await upsertChapter({
        guideId: guide.id,
        actorId: actor.id,
        payload: {
          parentId: null,
          orderIndex: (index + 1) * 100,
          title: chapter.title,
          slug: chapter.slug || slugify(chapter.title),
          summary: chapter.summary,
          contentType: "RICH_TEXT",
          contentHtml: richHtml({
            intro: chapter.summary,
            steps: [
              "Ouvrir le guide de votre école depuis Assistance.",
              "Vérifier la procédure locale associée au sujet.",
              "Appliquer le circuit interne recommandé par l'établissement.",
            ],
          }),
        },
      });
      chaptersCount += 1;

      for (
        let subIndex = 0;
        subIndex < chapter.subchapters.length;
        subIndex += 1
      ) {
        const sub = chapter.subchapters[subIndex];
        await upsertChapter({
          guideId: guide.id,
          actorId: actor.id,
          payload: {
            parentId: chapterRecord.id,
            orderIndex: (index + 1) * 100 + (subIndex + 1) * 10,
            title: sub.title,
            slug: sub.slug || slugify(sub.title),
            summary: sub.summary,
            contentType: sub.contentType,
            contentHtml: sub.contentHtml,
            videoUrl: sub.videoUrl,
          },
        });
        subchaptersCount += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        seededBy: `${actor.firstName} ${actor.lastName}`,
        guides: guidesCount,
        chapters: chaptersCount,
        subchapters: subchaptersCount,
        totalHelpChapters: chaptersCount + subchaptersCount,
        audiences: GUIDE_DEFINITIONS.map((item) => item.audience),
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
