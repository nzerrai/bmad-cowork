---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
inputDocuments: ["prjdocs/planning-artifacts/prds/bmad-portal-hub-2026-08-01/prd.md", "prjdocs/planning-artifacts/architecture/architecture-bmad-portal-hub-2026-08-01/ARCHITECTURE-SPINE.md", "prjdocs/planning-artifacts/ux-designs/ux-tarmacacademy-2026-08-01/DESIGN.md", "prjdocs/planning-artifacts/ux-designs/ux-tarmacacademy-2026-08-01/EXPERIENCE.md"]
---

# BMAD Portal MVP - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for BMAD Portal MVP - Artifact & Team Sync Hub, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

> Révision du 2026-08-06 : PRD mise à jour (2026-08-05, Copilot IA différé §7), DESIGN.md/EXPERIENCE.md mis à jour (2026-08-06, 3 nouvelles maquettes). Voir décisions de scope ci-dessous.
> Révision du 2026-08-06 (2) : Architecture Spine mise à jour — AD-009 (statut contributeur à deux axes) et AD-008 (retitré "one stream, one canonical read model") propagés dans FR14, Additional Requirements, et les Stories 3.4/3.5.
> Révision du 2026-08-06 (3) : Ajout d'Epic 0 (Project Scaffolding & Dev Environment, Story 0.1) suite au rapport d'Implementation Readiness — aucune story de setup initial n'existait pour ce système greenfield 3-tiers. Epic 0 est une story enabler sans FR associée, prérequis à Epic 1 ; correspond à Sprint 0 dans le planning.
> Révision du 2026-08-06 (4) : Ajout de Story 0.2 (Authentication & RBAC Foundation) à Epic 0 — point critique #1 du rapport de readiness : aucune story ne construisait l'authentification/RBAC alors qu'Epic 6 et toutes les surfaces gated par rôle le supposaient déjà en place. Provider d'identité et mapping rôle→permission détaillé restent différés à l'implémentation.

## Requirements Inventory

### Functional Requirements

FR1: Indexer tous les artifacts BMAD (Brainstorming, Brief, PRD, Architecture, UX, Tests, Specs, Epics, Stories, Décisions, Cérémonies)
FR2: Afficher un dashboard de santé des artifacts (complétude, liens entre artifacts, statut de sync avec le code)
FR3: Fournir une Traceability Matrix montrant le lien Idée/Brief → PRD → Archi/UX → Stories → PRs → Tests
FR4: Le Client (Agent local) scanne le dépôt local pour détecter les marqueurs BMad et l'état Git courant (identité du remote connecté, drift local : commits ahead/behind, actions Git en cours type rebase/merge/conflit)
FR5: Assurer une communication temps réel bidirectionnelle (WebSocket) entre Backend et Clients/IHM pour la présence, les notifications, le dispatch de commandes, et le reporting d'état du dépôt local (piggybacked sur le heartbeat)
FR6: Le Backend fait office de pont vers le dépôt Git distant et arbitre en dernier ressort les claims et changements d'état
FR7: Au lancement, le Client s'identifie automatiquement via le dépôt remote connecté (identifiant = host/org/repo complet) ; le dashboard affiche le nom court avec badge d'organisation en cas de collision de nom court
FR8: Le premier Client rapportant une identité non reconnue déclenche la création automatique de l'espace HUB correspondant ; les Clients suivants avec la même identité rejoignent automatiquement l'espace (zéro étape manuelle de création)
FR9: Si le Backend n'a pas encore accès en lecture au repo, l'espace est créé en statut `pending` (distinct de `active`/`access_revoked`) et le développeur reçoit un prompt actionnable pour accorder l'accès (lien scopé au provider Git, fallback texte générique sinon)
FR10: Le Client reporte en continu le drift Git local et les actions en cours au Backend — poussé immédiatement sur événement Git local (hook) avec un tick de sécurité de 10s (configurable) en fallback
FR11: Le Backend émet des leases à durée limitée pour réserver les User Stories ; le Client maintient un heartbeat WebSocket ; si le heartbeat cesse pendant plus de 60s, le Backend expire automatiquement le lease et libère le claim
FR12: Quand un claim est rejeté ou un conflit détecté, le Client est automatiquement signalé pour se resynchroniser avec le Backend/Remote Repo (Auto-Healing Sync)
FR13: Afficher une vue générale Git + BMAD (Dashboard Overview/Health : état global du repo, branches, PRs, sync status, Local vs Remote)
FR14: Afficher des vues par contributeur avec indicateurs de statut portés par deux signaux indépendants — presence (connecté/absent) et sync-state (Synchronisé/Drift/Conflit/Syncing-Actif/Claimé) — jamais fusionnés en storage ni en payload ; les surfaces multi-axes (Dashboard, Contributor Detail) rendent les deux indépendamment, et le Status Pill les collapse en une palette à 6 valeurs (Synchronisé/Drift/Conflit/Syncing-Actif/Claimé/Idle-Offline) selon la règle fixe : absent → toujours `Idle-Offline`, sinon la valeur du sync-state
FR15: Fournir un panneau Détail Contributeur (Fiche Contributeur) accessible depuis tout Status Pill/ligne nommant un contributeur : Identity Header, statut d'accès, état du dépôt en temps réel, projets liés, activité récente
FR16: Fournir une action `[Re-sync]` en un clic pour resynchroniser une ou plusieurs stories stale/en conflit
FR17: Afficher le status Sprint (progression stories done vs total, dates, objectifs)
FR18: Lister les cérémonies (standup, planning, review, retro) avec statut (upcoming, completed, missed) et liens vers les artifacts de notes
FR19: Générer des graphiques déterministes (burn-down chart, velocity chart) à partir des données d'artifacts et d'activité Git
FR20: Afficher des signaux de risque (stories stale in-progress sans activité > 3j, modules à haut risque de conflit Git, PRs en attente de review > 48h)
FR21: Vérifier déterministiquement les quality gates (specs présentes, PRs reviewed, tests liés) avec un score de compliance détaillé par section
FR22: Fournir une Administration Système (rôle Admin uniquement) : configuration du projet (Git/Repos), gestion des utilisateurs/rôles, gouvernance de la plateforme
FR23: Fournir des notifications instantanées non intrusives (WebSocket toasts) pour les mises à jour temps réel

### NonFunctional Requirements

NFR1: Toutes les opérations de sync, claim, et vérification d'état sont 100% déterministes (scripts CLI, parsing fichiers, commandes Git). Zéro appel LLM pour les tâches de sync, claim, ou vérification d'état.
NFR2: Scan et indexation des fichiers BMAD (Markdown, YAML, JSON) + état Git (branches, PRs, commits).
NFR3: Application web (React/Next.js) affichant les catalogues, graphiques, et vues rôle-dépendantes (Developer, PM, Architecte/Tech Lead, UX Designer, Admin).
NFR4: Isolation — le Client reste la seule entité avec accès direct au système de fichiers local de l'utilisateur.
NFR5: Toutes les transitions d'état critiques (claims, expirations de lease, événements de sync) sont journalisées dans `.memlog.md` pour garantir un historique lisible et vérifiable.
NFR6: Latence de sync minimale entre un événement Git et sa représentation visuelle dans le Dashboard.
NFR7: Taux de collision zéro — aucun double-claim ni conflit d'état en environnement multi-utilisateur.
NFR8: Contraste visuel élevé (WCAG AA) pour tous les indicateurs de statut opérationnels, sur `{colors.background}` et `{colors.surface}`.
NFR9: Accessibilité clavier complète pour les tables de données complexes et menus de commande ; ordre de tabulation suivant l'ordre de lecture visuel sur chaque surface.

### Additional Requirements

- Architecture 3-tiers : Client (Python CLI/Service), Backend (FastAPI + WebSockets + PostgreSQL/JSONB), IHM (React/Next.js + Recharts/D3)
- AD-002 (Lease-based Heartbeat) [ADOPTED] : claim = lease à durée limitée, expiration auto si heartbeat WebSocket > 60s
- AD-005 (Client-side Git Authority) [ADOPTED] : le Backend n'écrit jamais directement sur le disque local ; tout changement local passe par le Client Agent
- AD-004 (Hybrid Graph-Relational Store) — **RÉSOLU** : l'Architecture Spine a été mise à jour le 2026-08-06. AD-003 (Draft-only AI) et AD-004 sont déplacés en Deferred (Copilot IA différé en Post-MVP) ; nouveau AD-006 (MVP Data Layer) fixe PostgreSQL relationnel + JSONB uniquement pour le MVP — `pgvector` et la Knowledge Graph suivent le Copilot IA. La spine ajoute aussi AD-007 (Zero-Setup Onboarding & Space Identity).
- AD-008 (Local Repo State Reporting — one stream, one canonical read model) [ADOPTED] : le Client pousse un flux unique de drift/actions Git (hook immédiat + tick de sécurité 10s configurable, piggyback sur le heartbeat AD-002) ; le Backend maintient un seul enregistrement canonique versionné par contributeur — chaque consommateur (statut contributeur, Risk & Quality Signals FR20, Status Pill) lit ce même enregistrement, jamais une projection indépendante. Seuil de staleness 30s partagé par toutes les surfaces ("Last known — {time}" au-delà).
- AD-009 (Statut contributeur — deux signaux orthogonaux) [ADOPTED] : presence (`connecté`/`absent`) et sync-state (`synchronisé`/`drift`/`conflit`/`syncing-actif`/`claimé`) sont deux champs indépendamment modifiables en storage et en payload — jamais un enum fusionné, pour éviter qu'une mise à jour concurrente de l'un écrase l'autre. Les surfaces multi-axes (Dashboard, Contributor Detail) rendent les deux axes indépendamment. Le Status Pill (FR14/UX-DR5) est la seule règle de collapse sanctionnée : `absent` → toujours `Idle-Offline` quel que soit le sync-state, sinon la valeur du sync-state.
- Identity/Auth via RBAC (Backend)
- State Persistence via Git-based (Eventual Consistency, Remote Repo)
- Communication via WebSockets (Real-time Bidirectional)

### UX Design Requirements

UX-DR1: Thème dark-only "Modern Command" (Deep Navy `{colors.background}` #0A1120) ; pas de light theme prévu.
UX-DR2: Palette de statut opérationnel à 6 couleurs, une seule signification par couleur, jamais réutilisée ailleurs dans l'UI (Success/Warning/Error/Info/Action/Neutral).
UX-DR3: Distinction visuelle Local (muted — neutral/text-secondary) vs Remote (vibrant — info/action avec glow) context.
UX-DR4: Typographie Inter (UI/headings) + JetBrains Mono (data : hashes Git, chemins, branches, logs) ; chiffres tabulaires pour alignement des colonnes.
UX-DR5: Composant Status Pill — pastille + label ; clic navigue toujours vers le détail de l'entité (jamais purement décoratif).
UX-DR6: Composant Identity Header — avatar (initiales sur tuile gradient `{colors.action}`) + nom + rôle.
UX-DR7: Composant Alert Banner — bloc teinté/bordé, affiché uniquement si condition bloquante existe (pas de variant "tout va bien").
UX-DR8: Composant Data-heavy Tables — lignes haute densité, actions inline, cellules de statut colorées ; même règles pour paires label/valeur en panneau non-tabulaire.
UX-DR9: Composant Activity/Event Feed — flux vertical chronologique (plus récent en premier), plafonné à 20 entrées visibles + "Charger plus".
UX-DR10: Composant Real-time Status Bar — indicateur de connectivité WebSocket pleine largeur, `{colors.info}` actif / `{colors.neutral}` idle.
UX-DR11: Composant Contributor Detail Panel — composition Identity Header + Status Pill + Alert Banner (conditionnel) + Data-heavy Tables (accès & état repo) + Activity Feed.
UX-DR12: Information Architecture à 6 surfaces : Dashboard (Overview/Health), Synchronization Center, Artifact Management *(post-MVP)*, Sprint & Claim Management, System Administration (Admin only), Contributor Detail.
UX-DR13: États de cycle de vie UI définis par surface — Empty / Cold-load (skeleton) / Error-Offline / Permission-denied — pour Dashboard, Synchronization Center, Sprint & Claim Management, System Administration, Contributor Detail.
UX-DR14: Plateforme desktop/laptop uniquement — pas de breakpoints responsive.
UX-DR15: Accessibilité — focus ring visible `{colors.info}` en contraste AA sur chaque élément interactif ; navigation clavier complète, ordre de tabulation = ordre de lecture visuel.
UX-DR16: Composant AI Draft Card *(post-MVP, différé avec le Copilot IA)* — bordure pointillée/translucide `{colors.action}`, interaction `[Review]`/`[Reject]` explicite avant transition vers "Commit".

### FR Coverage Map

FR1: Epic 1 - Indexation des artifacts BMAD
FR2: Epic 1 - Dashboard de santé des artifacts
FR3: Epic 1 - Traceability Matrix
FR4: Epic 2 - Scan local du dépôt et détection de l'état Git
FR5: Epic 2 - Communication temps réel WebSocket (pilier nerveux)
FR6: Epic 2 - Backend comme pont vers le dépôt distant
FR7: Epic 2 - Identification automatique du Client via le remote
FR8: Epic 2 - Création/jonction automatique de l'espace Hub
FR9: Epic 2 - Statut `pending` et prompt d'accès actionnable
FR10: Epic 2 - Reporting continu du drift Git local
FR11: Epic 3 - Lease-based claiming avec heartbeat (deprecated - replaced by Epic 8 simplified claiming)
FR12: Epic 3 - Auto-Healing Sync
FR13: Epic 3 - Dashboard Overview/Health (vue Git + BMAD)
FR14: Epic 3 - Vues par contributeur avec indicateurs de statut
FR15: Epic 3 - Panneau Détail Contributeur (Fiche Contributeur)
FR16: Epic 3 - Action Re-sync en un clic
FR17: Epic 4 - Status Sprint
FR18: Epic 4 - Cérémonies
FR19: Epic 4 - Graphiques déterministes
FR20: Epic 5 - Signaux de risque (deprecated - replaced by Epic 8 simplified status)
FR21: Epic 5 - Quality Gates avec score de compliance
FR22: Epic 6 - Administration Système
FR23: Epic 3 - Notifications instantanées

Epic 8 - HUB Simplification & Dashboard Repo Listing (simplified login entry point, latest status only, user-scoped repo listing, dashboard content per repository)

**Epic 0 (Project Scaffolding & Dev Environment) : aucune FR numérotée** — couvre l'Additional Requirement "Identity/Auth via RBAC (Backend)" plus le scaffolding technique ; prérequis à Epic 1 et à tout le reste, correspond à Sprint 0.

## Epic List

### Epic 0: Project Scaffolding & Dev Environment
Sprint 0. La fondation technique des 3 tiers (Client Python, Backend FastAPI, IHM Next.js) est en place et exécutable localement, et l'authentification/RBAC existe comme substrat pour toutes les surfaces gated par rôle — avant toute story à valeur utilisateur.
**FRs covered:** Aucune FR numérotée ; couvre l'Additional Requirement "Identity/Auth via RBAC (Backend)"
**Implementation Notes:** Story 0.1 est un enabler pur (pas de mapping FR). Story 0.2 (Auth/RBAC) a une vraie valeur utilisateur (se connecter, être reconnu par son rôle) mais reste ici car c'est un prérequis transverse à tout le reste, notamment Epic 6. Le choix de topologie de déploiement (K8s vs serverless) et le mapping détaillé rôle→permission restent explicitement différés (voir `ARCHITECTURE-SPINE.md` § Deferred) — hors scope de cet epic.

### Epic 1: Artifact Health & Traceability Catalog
Les utilisateurs voient la santé et la complétude de tous les artifacts BMAD et tracent la lignée complète idée → tests.
**FRs covered:** FR1, FR2, FR3
**Implementation Notes:** Nécessite un moteur d'indexation des artifacts BMAD et la construction du graphe de traçabilité.

### Epic 2: Distributed Sync & Zero-Setup Onboarding
Un développeur lance son Client local, qui s'identifie automatiquement via le dépôt Git distant, rejoint ou crée l'espace Hub correspondant, et reporte en continu son état Git local (drift, actions en cours) au Backend.
**FRs covered:** FR4, FR5, FR6, FR7, FR8, FR9, FR10
**Implementation Notes:** Client Python (scan local, Git hook, heartbeat WebSocket), Backend FastAPI (provisioning d'espace, statuts pending/active/access_revoked), pilier WebSocket partagé avec Epic 3.

### Epic 3: Claims, Contributors & Team Sync View
Les membres de l'équipe voient en temps réel qui est synchronisé ou en conflit, réservent des User Stories via un mécanisme de lease sans risque de double-claim, et consultent le détail d'un contributeur.
**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16, FR23
**Implementation Notes:** S'appuie sur le pilier WebSocket et le Backend établis en Epic 2 ; introduit le service de lease (AD-002), le Dashboard Overview/Health, et le Contributor Detail Panel.

### Epic 4: Sprint & Ceremony Dashboard
Les utilisateurs suivent la progression du sprint et le statut des cérémonies avec des métriques déterministes.
**FRs covered:** FR17, FR18, FR19
**Implementation Notes:** Nécessite l'agrégation des données de sprint et la génération déterministe de graphiques.

### Epic 5: Risk & Quality Signals
Les utilisateurs identifient les stories à risque, les modules à risque de conflit Git, et vérifient les quality gates avec un score de compliance détaillé par section.
**FRs covered:** FR20, FR21
**Implementation Notes:** Nécessite la logique de détection de signaux de risque et la vérification des quality gates avec breakdown par section.

### Epic 6: System Administration
Un Admin configure les dépôts Git du projet, gère les utilisateurs/rôles, et supervise la gouvernance de la plateforme.
**FRs covered:** FR22
**Implementation Notes:** Surface réservée au rôle Admin (RBAC) ; configuration Git/Repos, gestion Users/Roles, gouvernance.

### Epic 8: HUB Simplification & Dashboard Repo Listing
Le comportement du HUB est simplifié pour éliminer la complexité inutile : login comme point d'entrée unique, enregistrement simple du dernier status sans historique complexe, et dashboard affichant pour chaque repo locale : info distante, statut Git basique, utilisateurs connectés/précédents, US en développement.
**FRs covered:** FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR13, FR14, FR15, FR23
**Implementation Notes:** Cette epic documente les décisions de simplification du HUB : suppression des mécanismes complexes de claims par bail (lease) + heartbeat WebSocket, suppression des signaux de risque complexes et calculs de péremption, enregistrement du dernier status seulement sans historique complexe, login comme point d'entrée unique → redirection vers `/hub/dashboard`, dashboard affiche pour chaque repo locale : info distante, status Git (branche, ahead/behind), utilisateurs connectés/précédents, US en développement.

## Epic 0: Project Scaffolding & Dev Environment
Sprint 0. La fondation technique des 3 tiers (Client Python, Backend FastAPI, IHM Next.js) est en place et exécutable localement, et l'authentification/RBAC existe comme substrat pour toutes les surfaces gated par rôle — avant toute story à valeur utilisateur.

### Story 0.1: Project Scaffolding & Dev Environment

As a Development Team,
I want the three tiers (Client Python, Backend FastAPI, IHM Next.js) scaffolded with a working local dev setup, initial database migrations, and a CI pipeline,
So that Epic 1 and onward can start on a real, buildable, testable foundation instead of improvising structure mid-feature.

**Acceptance Criteria:**

**Given** no code exists yet for any of the 3 tiers
**When** the scaffolding is executed
**Then** the Client (Python), Backend (FastAPI), and IHM (Next.js/React) each start locally from their minimal configuration, per the versions pinned in `ARCHITECTURE-SPINE.md` (Stack)
**And** initial PostgreSQL migrations are in place (empty, versioned schema — no feature tables yet)
**And** a CI pipeline runs lint and automated tests on every PR
**And** a README/CONTRIBUTING documents how to run all 3 services locally
**And** deployment topology (K8s vs. serverless, environments) is explicitly out of scope for this story — remains deferred per `ARCHITECTURE-SPINE.md` § Deferred

### Story 0.2: Authentication & RBAC Foundation

As a user of the Portal (Developer, PM, Architect/Tech Lead, UX Designer, or Admin — PRD §2),
I want to authenticate and have my role recognized by the Backend,
So that role-gated surfaces and actions (System Administration, claim ownership, contributor identity) work correctly from the first sprint onward instead of every later epic assuming a login system that doesn't exist yet.

**Acceptance Criteria:**

**Given** a user with valid credentials for the platform's identity provider
**When** they authenticate against the Backend
**Then** a session is established and the user's role is attached to every subsequent request
**And** RBAC enforcement rejects any request for a role-gated action/surface the user's role doesn't permit
**And** an unauthenticated request to any protected route is rejected outright — never silently served with default or empty data
**And** the concrete identity provider (SSO vs. email/password vs. other) and the full role→permission matrix are implementation details deferred to dev time (see `ARCHITECTURE-SPINE.md` § Deferred, "RBAC role-to-permission matrix detail") — this story only guarantees the enforcement substrate exists so Epic 6 and every role-gated AC elsewhere have something real to build on

## Epic 1: Artifact Health & Traceability Catalog
Les utilisateurs voient la santé et la complétude de tous les artifacts BMAD et tracent la lignée complète idée → tests.

### Story 1.1: Artifact Indexing Engine *(Enabler)*

*Enabler story — no direct human actor; the indexing engine itself has no UI. It exists to make Stories 1.2 and 1.3 buildable. Not framed as "As a [user]" — see PM Note in Implementation Readiness review, 2026-08-06.*

As the Portal's indexing engine,
I index all BMAD artifacts (Brainstorming, Brief, PRD, Architecture, UX, Tests, Specs, Epics, Stories, Decisions, Cérémonies),
So that the Product Manager / Analyst (Stories 1.2, 1.3) can see artifact health and traceability instead of raw files.

**Acceptance Criteria:**

**Given** BMAD artifacts exist in the project directory or Git repo
**When** the indexing engine runs
**Then** all artifact types are discovered and cataloged with their metadata
**And** the index is updated when new artifacts are added or modified
**And** a malformed or unparseable artifact (e.g. invalid YAML frontmatter) is flagged in the index with an error state instead of being silently skipped or crashing the run

### Story 1.2: Artifact Health Dashboard

As a Product Manager,
I want to see the health and completeness of artifacts,
So that I can identify gaps and ensure documentation quality.

**Acceptance Criteria:**

**Given** artifacts are indexed
**When** the user views the health dashboard
**Then** each artifact type shows its completeness status (complete/incomplete/missing)
**And** links between artifacts are displayed (PRD -> Archi -> Stories)
**And** sync status with code is shown for each artifact
**And** if a linked artifact can't be resolved (broken cross-reference), that link renders as broken rather than being silently omitted

### Story 1.3: Traceability Matrix

As a Tech Lead / Analyst,
I want to see the traceability matrix showing the link Idée/Brief -> PRD -> Archi/UX -> Stories -> PRs -> Tests,
So that I can verify complete coverage and requirement fulfillment.

**Acceptance Criteria:**

**Given** artifacts and stories are indexed
**When** the user views the traceability matrix
**Then** the linear or graphical view shows the complete lineage from idea to tests
**And** each node in the matrix shows its status (completed/pending/linked)
**And** a node with no artifact yet (e.g. a Story with no linked PR) shows as "Not started" rather than being omitted from the matrix

## Epic 2: Distributed Sync & Zero-Setup Onboarding
Un développeur lance son Client local, qui s'identifie automatiquement via le dépôt Git distant, rejoint ou crée l'espace Hub correspondant, et reporte en continu son état Git local (drift, actions en cours) au Backend.

### Story 2.1: Real-time WebSocket Communication Pillar

As a Developer,
I want a persistent real-time WebSocket connection between my Client/IHM and the Backend,
So that presence, notifications, and command dispatch happen instantly without polling.

**Acceptance Criteria:**

**Given** a Client or IHM connects to the Backend
**When** a presence, notification, or command event occurs
**Then** it is delivered over the WebSocket connection in real time
**And** the Backend acts as the bridge/final arbiter for claims and state changes routed to the remote repository
**And** if the WebSocket connection drops, the Client/IHM automatically attempts reconnection with backoff, and the Real-time Status Bar (Story 3.3) reflects the disconnected state until it recovers

### Story 2.2: Local Repo Scan & Git State Detection

As a Developer,
I want my local Client to scan my repository and detect BMad markers and current Git state,
So that my project's local state can be tracked and reported accurately.

**Acceptance Criteria:**

**Given** a BMad-enabled repository on my machine
**When** the Client agent starts or performs a scan
**Then** it detects the connected remote repository identity (host/org/repo)
**And** it detects local drift (commits ahead/behind)
**And** it detects any in-progress Git action (rebase, merge, conflict)

### Story 2.3: Zero-Setup Onboarding & Application Identity

As a Developer,
I want my Client to automatically identify itself via my connected remote repository when I launch it,
So that I can join my team's Hub space without any manual setup step.

**Acceptance Criteria:**

**Given** the Client launches and detects a connected remote repository
**When** it reports its identity to the Backend for the first time
**Then** the technical identifier is the full remote path (host/org/repo)
**And** if no Hub space exists yet for that identity, one is automatically created
**And** subsequent Clients reporting the same identity join the existing space automatically
**And** the dashboard displays the short repo name, showing an org badge/tooltip only when two spaces share the same short name

### Story 2.4: Pending Access State & Actionable Prompt

As a Developer,
I want to be notified with an actionable prompt when the Backend doesn't yet have read access to my repository,
So that I can grant access and unblock my Hub space instead of hitting a silent failure.

**Acceptance Criteria:**

**Given** a Client reports an identity the Backend cannot yet read
**When** the Hub space is created
**Then** its status is set to `pending` (distinct from `active` and `access_revoked`)
**And** the connecting developer receives a direct link to grant access, scoped to the project's Git provider
**And** a generic text fallback is shown if the provider cannot be determined

### Story 2.5: Continuous Local Repo State Reporting

As a Developer,
I want my Client to continuously report local Git drift and in-progress actions to the Backend,
So that my status stays accurate without me doing anything manually.

**Acceptance Criteria:**

**Given** a local Git event occurs (commit, push, merge start)
**When** the Git hook fires
**Then** the updated state is pushed immediately to the Backend over the heartbeat
**And** if the hook does not fire, a configurable 10-second safety tick still reports the state as fallback
**And** this single state stream feeds both contributor status visibility and Risk & Quality Signals (Epic 5)

## Epic 3: Claims, Contributors & Team Sync View
Les membres de l'équipe voient en temps réel qui est synchronisé ou en conflit, réservent des User Stories via un mécanisme de lease sans risque de double-claim, et consultent le détail d'un contributeur.

### Story 3.1: Lease-based Story Claiming

As a Developer,
I want to claim a User Story via a time-limited lease issued by the Backend,
So that I have exclusive, temporary ownership without risking a stale double-claim.

**Acceptance Criteria:**

**Given** a User Story is available (unclaimed)
**When** I claim it
**Then** the Backend issues a time-limited lease and marks the story as Claimed
**And** my Client maintains a WebSocket heartbeat to keep the lease alive
**And** if my heartbeat stops for more than 60 seconds, the Backend automatically expires the lease and marks the story available again

### Story 3.2: Auto-Healing Sync on Claim Conflict

As a Developer,
I want my Client to be automatically resynchronized when a claim is rejected or a conflict is detected,
So that I don't end up working from stale state.

**Acceptance Criteria:**

**Given** I attempt a claim that is rejected, or a conflict is detected on my active claim
**When** the Backend detects this
**Then** it signals my Client to automatically synchronize its state with the Backend/Remote Repo
**And** my local view reflects the corrected state without manual refresh

### Story 3.3: Dashboard Overview/Health

As a Team Member,
I want a Dashboard showing the global Git + BMAD state (branches, PRs, sync status, Local vs Remote),
So that I understand the overall project synchronization state at a glance.

> **Note (résolu 2026-08-06) :** cette story couvre à la fois "Dashboard (Overview/Health)" et la surface nommée "Synchronization Center" dans EXPERIENCE.md — ce sont le même écran, pas deux écrans distincts. Aucune story séparée n'est nécessaire pour "Synchronization Center".

**Acceptance Criteria:**

**Given** the Hub has connected Clients and repository data
**When** I open the Dashboard
**Then** the current branch state and open PRs are shown with their status
**And** Local vs Remote context is visually distinguished per DESIGN.md
**And** a Real-time Status Bar shows WebSocket connectivity (`{colors.info}` active / `{colors.neutral}` idle)
**And** if the Hub is unreachable, the bar turns `{colors.error}` ("Hub unreachable — showing last known state") and data stays visible, timestamped as stale
**And** if no repositories are connected yet, the view shows "No repositories connected yet" with a link to onboarding instead of empty cards

### Story 3.4: Contributor Views with Status Indicators

As a Team Member / PM,
I want to see contributor rows with a Status Pill reflecting their state,
So that I know who is currently active and what state their work is in.

**Acceptance Criteria:**

**Given** contributors have a presence signal (connected/absent) and a sync-state signal (Synced/Drift/Conflict/Syncing-Active/Claimed), stored and reported as two independent fields
**When** the contributor grid/table is displayed
**Then** each contributor shows a single Status Pill computed by the fixed collapse rule: if presence = absent, the Pill always shows Idle-Offline regardless of sync-state; otherwise the Pill shows the sync-state value
**And** clicking a Status Pill navigates to that contributor's Detail panel

### Story 3.5: Contributor Detail Panel

As a Team Member,
I want to open a Contributor Detail panel for any contributor,
So that I can see their full access status, live repo state, linked projects, and recent activity.

**Acceptance Criteria:**

**Given** I click a Status Pill or table row naming a contributor
**When** the Contributor Detail panel opens
**Then** it composes Identity Header + Status Pill + Alert Banner (only if a blocking condition exists) + Data-heavy Tables (Access & Repo State) + Activity Feed
**And** as a multi-axis surface, the panel renders presence (Connected/Absent) and sync-state (Synced/Drift/Conflict/Syncing-Active/Claimed) as two independent indicators alongside the collapsed Status Pill — never inferring one from the other
**And** if the repo-state heartbeat is stale (>30s), repo-state rows show "Last known — {time}" instead of live values while access-status rows remain unaffected
**And** a viewer without project access sees identity/access-status sections but repo-state/activity sections read "Requires project access"

### Story 3.6: One-click Re-sync

As a PM / Developer,
I want a one-click [Re-sync] action on stale or conflicted stories,
So that I can quickly refresh their state without manual investigation.

**Acceptance Criteria:**

**Given** one or more stories are flagged stale or in conflict
**When** I select them and trigger [Re-sync]
**Then** each story re-fetches its latest Git-linked state independently
**And** a story that fails to re-sync shows an inline error "Re-sync failed — retry" without blocking the others that succeed

### Story 3.7: Real-time Notifications

As a Team Member,
I want non-intrusive WebSocket toast notifications for real-time updates,
So that I stay informed without needing to refresh or actively watch the dashboard.

**Acceptance Criteria:**

**Given** a relevant real-time event occurs (claim, sync, conflict, commit)
**When** it is pushed to my connected session
**Then** a non-intrusive toast notification appears
**And** it does not block or interrupt my current interaction

## Epic 4: Sprint & Ceremony Dashboard
Les utilisateurs suivent la progression du sprint et le statut des cérémonies avec des métriques déterministes.

### Story 4.1: Sprint Status Display

As a Product Manager / Team Member,
I want to see the sprint status (progression stories done vs total, dates, objectives),
So that I can track sprint progress and goals.

**Acceptance Criteria:**

**Given** a sprint is active or completed
**When** the sprint status is viewed
**Then** progression shows stories done vs total
**And** sprint dates and objectives are displayed
**And** the completion percentage is calculated
**And** if no sprint is currently configured, the view shows "No active sprint" instead of a zeroed/empty progress bar

### Story 4.2: Ceremony List and Status

As a Team Member,
I want to see a list of ceremonies (standup, planning, review, retro) with status (upcoming, completed, missed) and links to notes artifacts,
So that I know which ceremonies occurred and can review notes.

**Acceptance Criteria:**

**Given** ceremonies are scheduled or completed
**When** the ceremony dashboard is viewed
**Then** each ceremony shows status (upcoming, completed, missed)
**And** links to notes artifacts are provided for completed ceremonies
**And** upcoming ceremonies are listed for planning
**And** a completed ceremony with no linked notes artifact shows "No notes yet" instead of a broken link

### Story 4.3: Deterministic Charts Generation

As a PM / Analyst,
I want to see deterministic charts (burn-down chart, velocity chart) generated from artifact and Git activity data,
So that I can track team velocity and sprint progress without AI interference.

**Acceptance Criteria:**

**Given** artifact data and Git activity exist
**When** the charts dashboard is viewed
**Then** burn-down chart is generated deterministically from sprint data
**And** velocity chart is generated from completed story data
**And** charts are updated based on deterministic calculations
**And** if insufficient data exists to compute a chart (e.g. sprint just started), it shows an explicit "Not enough data yet" state instead of a misleading empty/zero chart

## Epic 5: Risk & Quality Signals
Les utilisateurs identifient les stories à risque, les modules à risque de conflit Git, et vérifient les quality gates avec un score de compliance détaillé par section.

### Story 5.1: Risk Signals Display

As a Tech Lead / PM,
I want to see risk signals (stories stale/in-progress without activity > 3j, high-risk Git conflict modules, PRs awaiting review > 48h),
So that I can identify and address potential issues early.

**Acceptance Criteria:**

**Given** stories, modules, and PRs exist in the system
**When** the risk signals dashboard is viewed
**Then** stale stories (in-progress without activity > 3 days) are listed
**And** high-risk Git conflict modules are identified
**And** PRs awaiting review > 48 hours are flagged

### Story 5.2: Quality Gates Verification with Compliance Score Breakdown

As a QA / Reviewer,
I want to verify quality gates deterministically (specs present, PRs reviewed, tests linked) with a per-section compliance score,
So that I can see exactly which section is dragging the score down instead of a single opaque pass/fail.

**Acceptance Criteria:**

**Given** artifacts and PRs exist in the system
**When** quality gates are checked
**Then** specs presence, PR review status, and test linkage are each verified
**And** a compliance score is generated with a breakdown per section (e.g., missing acceptance criteria)
**And** if a linked artifact can't be reached (broken cross-reference), that section shows "Unresolved reference: {path}" instead of a score, and the overall score is marked partial rather than silently averaged

## Epic 6: System Administration
Un Admin configure les dépôts Git du projet, gère les utilisateurs/rôles, et supervise la gouvernance de la plateforme.

### Story 6.1: Git/Repos Project Configuration

As an Admin,
I want to configure the project's connected Git repositories,
So that the platform tracks the correct sources of truth for my team's Hub space.

**Acceptance Criteria:**

**Given** I am authenticated with the Admin role
**When** I open System Administration
**Then** I can view and edit the connected Git repository configuration for the project
**And** a non-Admin user never sees this nav item — it is hidden entirely, never shown-then-blocked
**And** while data is loading, skeleton form fields are shown; if the Backend is unreachable, save actions are disabled and a "Reconnecting…" toast appears

### Story 6.2: User & Role Management

As an Admin,
I want to manage users and their roles (Developer, PM, Architect/Tech Lead, UX Designer, Admin),
So that access and permissions stay accurate as the team changes, covering platform governance.

**Acceptance Criteria:**

**Given** I am an Admin viewing System Administration
**When** I assign or change a user's role
**Then** the change is persisted and enforced via RBAC on the user's next action
**And** the affected user's available navigation items update accordingly
**And** if the save fails due to a Backend disconnect, the change is not silently lost — the toast confirms the retry state

---

## Epic 7: VS Code Plugin - IDE Integration & Dashboard Display
Une option d'interaction supplémentaire via un plugin VS Code avec polling configurable et affichage des dashboards HUB via Web Views, offrant la parité de fonctionnalités de base avec le Client Python (Epic 2) mais dans une expérience IDE intégrée.

**FRs covered:** FR4, FR5, FR10 (polling configurable vs Git hooks), FR13, FR14, FR20 (dashboard display via Web Views), FR23 (notifications VS Code)

**Implementation Notes:** Cette epic est une capacité d'interface additionnelle qui réutilise le même Backend Hub que les Epics 0-6. Elle offre le choix entre Client Python (Epic 2) et Plugin VS Code (Epic 7). Le polling configurable (défaut 5 min) remplace ou complète le mécanisme Git hooks du Client Python. Les Web Views reproduisent les dashboards HUB existants.

### Story 7.1: VS Code Extension Skeleton & `package.json` Setup

As a VS Code Plugin Developer,
I want to create the base structure of the BMad Portal VS Code extension,
So that the plugin has proper VS Code contributions, commands, and settings configuration.

**Acceptance Criteria:**

**Given** the VS Code extension project structure
**When** the `package.json` is configured
**Then** it defines proper VS Code contributions (commands, settings, webviews, status bar widget)
**And** the configuration section defines all setup parameters (backendHubUrl, repoPollingIntervalSec, authMethod, dashboardDisplayMode, etc.)
**And** the extension is buildable and installable in VS Code

### Story 7.2: Configurable Repo Polling Engine (Default 5 min)

As a VS Code Plugin User,
I want my plugin to poll the local repo state at a configurable interval (default 5 minutes),
So that my Git state is reported to the Backend Hub without needing Git hooks.

**Acceptance Criteria:**

**Given** the VS Code extension is running
**When** the polling engine starts
**Then** it uses `vscode.git` API to detect local repo state (branches, commits ahead/behind, in-progress actions)
**And** it polls at the interval specified in settings (`bmadPortal.repoPollingIntervalSec`, default 300 seconds)
**And** it reports the state to the Backend Hub via WebSocket or HTTP REST API

### Story 7.3: Event-Driven Git Polling Override

As a VS Code Plugin User,
I want the plugin to force an immediate repo state upload if a Git event is detected between polling intervals,
So that my state is accurate even between scheduled polls.

**Acceptance Criteria:**

**Given** the polling engine is running
**When** a Git event is detected (commit, checkout, merge start)
**Then** the plugin can trigger an immediate state upload to the Backend Hub (if `bmadPortal.enableEventDrivenPolling` is true)
**And** the next scheduled poll is not disrupted

### Story 7.4: VS Code Secret Storage for JWT Management

As a VS Code Plugin Developer,
I want to store JWT tokens securely using VS Code Secret Storage,
So that user credentials are never exposed or stored in plain text.

**Acceptance Criteria:**

**Given** the user is authenticated with the Backend Hub
**When** a JWT token is received
**Then** it is stored in `vscode.SecretStorage` (not in plain settings or config files)
**And** the token is retrieved securely for subsequent WebSocket/HTTP requests
**And** token expiration or invalidation triggers a re-authentication flow

### Story 7.5: Web View Provider Setup for Sidebar Dashboard

As a VS Code Plugin User,
I want to see a persistent sidebar panel with the HUB dashboard navigation,
So that I can access dashboard widgets without leaving VS Code.

**Acceptance Criteria:**

**Given** the VS Code extension is activated
**When** the user opens the BMad Portal dashboard
**Then** a `WebviewViewProvider` is displayed in the sidebar with navigation arborescence (Dashboard Overview, My Claims, Risk Signals, Sprint Status)
**And** clicking navigation items updates the Web View content
**And** the Web View respects VS Code themes (light/dark) and accessibility standards (WCAG AA)

### Story 7.6: Dashboard Widgets Integration (Repo State, Claims, Risk Signals)

As a VS Code Plugin User,
I want to see HUB dashboard widgets (repo state, active claims, risk signals) in the VS Code Web Views,
So that I have the same visibility as the main HUB IHM.

**Acceptance Criteria:**

**Given** the Web View dashboard is open
**When** data is fetched from the Backend Hub (WebSocket or HTTP)
**Then** the Repo State widget shows local drift, sync status, and Git actions
**And** the Claims widget shows active leases and available stories
**And** the Risk Signals widget shows stale tasks, conflict modules, and PRs awaiting review
**And** the dashboard refreshes according to `bmadPortal.dashboardRefreshIntervalSec`

### Story 7.7: Claims Visualization & Command Palette Integration

As a VS Code Plugin User,
I want to see feature suggestions based on my claims/role and access them via Command Palette,
So that I can take advantage of permissions authorized for my role.

**Acceptance Criteria:**

**Given** the user's JWT claims are resolved (role, permissions)
**When** the plugin processes claims
**Then** a Status Bar widget displays sync status and user role (e.g., "🟢 Synced | Dev: [username]")
**And** the Command Palette includes `BMad Portal: Show Suggested Features`
**And** non-intrusive Toast notifications appear for claims events (expiration, new available features)

### Story 7.8: VS Code Plugin Setup & Onboarding UX

As a VS Code Plugin User,
I want a smooth onboarding experience and easy access to plugin settings,
So that I can configure the plugin without technical friction.

**Acceptance Criteria:**

**Given** the plugin is first installed or activated
**When** the user opens VS Code Settings → Extensions → BMad Portal Hub
**Then** all configuration parameters are exposed via VS Code Settings UI (not raw JSON)
**And** default values are sensible (polling interval 300s, dashboard display sidebarView, claims suggestions enabled)
**And** the setup experience respects VS Code accessibility and theme guidelines

---

## Epic 8: HUB Simplification & Dashboard Repo Listing

Le comportement du HUB est simplifié pour éliminer la complexité inutile : login comme point d'entrée unique, enregistrement simple du dernier status sans historique complexe, et dashboard affichant pour chaque repo locale : info distante, statut Git basique, utilisateurs connectés/précédents, US en développement.

**FRs covered:** FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR13, FR14, FR15, FR23

**Implementation Notes:** Cette epic documente les décisions de simplification du HUB :
- Suppression des mécanismes complexes de claims par bail (lease) + heartbeat WebSocket (anciennement Epic 3 Story 3.1)
- Suppression des signaux de risque complexes et calculs de péremption (anciennement Epic 5)
- Enregistrement du **dernier status seulement** sans historique complexe ni calculs de staleness
- Login comme point d'entrée unique → redirection vers `/hub/dashboard`
- Dashboard affiche pour **chaque repo locale** : info distante, status Git (branche, ahead/behind), utilisateurs connectés/précédents, US en développement

### Story 8.1: Login as Entry Point & User-Scoped Repo Listing

As a user of the HUB,
I want to log in and see only the repositories I am attached to (or all repos if I am admin),
So that the dashboard is personalized and relevant to me without complexity.

**Acceptance Criteria:**

**Given** a user successfully logs into the HUB
**When** they are redirected to `/hub/dashboard` (instead of `/artifacts`)
**Then** regular users see only the repos they are attached to (via the `SpaceMembership` model)
**And** administrators see all repos in the HUB
**And** the dashboard displays a list of repositories attached to the connected user

### Story 8.2: Latest Status Only (No Complex History)

As a HUB Backend,
I want to store simply the latest status from each connected client/extension — without complex history or staleness calculations,
So that the system remains simple and performant.

**Acceptance Criteria:**

**Given** a client or extension sends periodic status updates for local repositories
**When** the HUB receives the status
**Then** it stores only the latest status — branch, ahead/behind counts, and in-progress actions
**And** no complex history or staleness tracking is maintained
**And** the dashboard displays the current Git status without "Last known — Xs ago" calculations

### Story 8.3: Dashboard Content per Repository

As a HUB user,
I want the dashboard to display for each repository: remote repo info, current Git status, connected users, and US in development,
So that I have a clear, simplified view of the repository state.

**Acceptance Criteria:**

**Given** a repository is displayed in the dashboard
**When** the user views the repository entry
**Then** it shows the remote repository information
**And** it shows the current Git status (branch, ahead/behind counts) sent by the local client/extension
**And** it shows users currently connected or who have previously connected to this repository
**And** it shows User Stories in development linked to this repository

### Story 8.4: Simplified User Story Claims

As a Developer,
I want to claim User Stories for development, with the HUB tracking who is working on which story based on the latest status reports,
So that I have simple story ownership without complex lease/heartbeat mechanisms.

**Acceptance Criteria:**

**Given** a User Story is available
**When** a user claims it
**Then** the HUB tracks which user is currently working on which story based on the latest status reports from clients/extensions
**And** no lease-based claiming with WebSocket heartbeat expiration is required

- **Assistant de Rédaction (Drafting Assistant)** : l'IA propose du contenu (PRD, Specs, Stories) suivant les templates BMad ; les propositions sont des "Drafts" nécessitant validation/commit manuel.
- **Interface RAG (Provenance-Linked Graph-RAG)** : Knowledge Graph (`Story -> implements -> PRD`, etc.) pour répondre à des questions complexes ; chaque étape de raisonnement ancrée à `{file_path, git_hash, line_range}`.
- **Coach de Méthodologie (Actor-Critic)** : agent proposeur + agent "Auditeur" vérifiant la conformité aux quality gates BMad.
- **Dépendances techniques différées** : extension `pgvector` sur PostgreSQL, couche Knowledge Graph dans le Backend, surface de requêtage IA dans l'IHM (surface "Artifact Management").
- **Garde-fous à réinstaurer à la reprise** : l'IA n'exécute jamais d'action du socle déterministe (claim, statut, sync) de façon autonome ; tout contenu généré par l'IA passe par un cycle "Draft → Review → Commit" (Human-in-the-loop).
