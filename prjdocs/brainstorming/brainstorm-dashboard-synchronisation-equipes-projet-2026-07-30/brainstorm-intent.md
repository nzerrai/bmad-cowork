# Intent Brief — Dashboard & synchronisation équipes projet

## Sujet / Objectif
Dashboard IHM + système de synchronisation temps réel pour équipes de projet, basé sur les artifacts BMAD. Objectifs : améliorer la coordination entre équipes, réduire les conflits Git, fournir du reporting, économiser des tokens (mécanisme 100% déterministe, zéro appel LLM — en cohérence avec NFR1).

## Décisions de mécanisme

**Identification d'espace HUB**
- ID technique unique = chemin complet du remote Git (host/org/repo), contrainte d'unicité en base.
- Nom affiché dashboard = nom court du repo ; badge/tooltip org affiché uniquement en cas d'ambiguïté entre deux espaces au même nom court.

**Auto-join / auto-clustering**
- Le Client Python communique automatiquement le nom du repo distant connecté au lancement.
- Auto-clustering à la volée côté HUB : le 1er client annonçant un repo inconnu crée l'espace, les suivants avec le même identifiant le rejoignent automatiquement. Pas d'étape manuelle de création d'espace.

**Gestion des accès**
- Init automatique de l'espace SI le HUB a déjà l'accès lecture au repo distant.
- Sinon : l'espace est créé quand même (statut `🟡 en attente d'accès`), et une alerte est envoyée au dev avec un lien d'action direct (deploy key / install app) scopé au provider unique détecté sur le projet, avec fallback texte générique si le provider n'est pas déterminable. Pas de détection multi-provider en MVP.
- Statut d'accès modélisé sur 3 valeurs (pas un booléen) : `pending` / `active` / `access_revoked`.

**Remontée d'état repo local**
- Le Client Python remonte l'état du repo local : déphasage ahead/behind, action Git en cours (rebase/merge/conflit).
- Transport : piggyback sur le heartbeat WebSocket existant (AD-002), avec envoi immédiat déclenché par hook Git local + tick de sécurité toutes les 10s (paramétrable).
- Source unique de donnée, deux consommateurs : FR5 (carte contributeur enrichie) et FR10/Epic4 (signaux de risque agrégés).

## Décision de scope (à respecter en aval)
Le zéro-config auto-join (jointure automatique au bon espace HUB sans aucune saisie utilisateur) est un **pari de design assumé, pas un besoin utilisateur validé sur le terrain**. Construire la version minimale viable de ce mécanisme, sans l'étendre tant qu'un besoin réel n'a pas été observé (même discipline de scope que la décision de différer le Copilot IA du PRD).
