---
title: "BMAD Portal MVP - Artifact & Team Sync Hub"
status: final
created: 2026-07-30
updated: 2026-08-01
---

# BMAD Portal MVP - Artifact & Team Sync Hub

## 1. Overview & Purpose

**Nom du projet :** BMAD Portal MVP  
**Objectif :** Créer un portail performant (Web app) qui offre une vue globale et efficace sur l'état d'un projet BMAD, en unifiant la gestion des artifacts BMAD, la synchronisation d'équipe (vision locale vs Git), les statuts des contributeurs, et le suivi des sprints.  
**Principe fondateur :** 100% déterministe, zéro appel LLM pour les tâches de sync, claim, ou vérification d'état. La source de vérité unique est le couple **Artifacts BMAD + État Git**.

**Contexte d'usage :** Initialement conçu pour un usage interne, le portail est architecturé pour pouvoir être commercialisé à terme.

## 2. Target Users & Roles

Le portail s'adapte aux différents acteurs du projet :

- **Developers (Dev) :** Vue leurs tâches US, statut de sync local/remote, gestion des claims, branches et PRs.
- **Product Managers (PM) / Product Owners :** Vue Roadmap, Sprint Status, Artifact Health, Risk Signals.
- **Analysts (Analyste) :** Vue des artifacts PRD, Brief, Specs, liens avec les stories et les besoins métier, traçabilité des exigences.
- **Tech Leads / Architects :** Vue Compliance & Quality Gates, Traceability Matrix, Dependency Map.
- **QA / Reviewers :** Vue Tests, PRs to review, Spec vs Implementation compliance.

## 3. Core Features (MVP Scope)

### 3.1. Artifact Health & Traceability Catalog

- **Indexation de tous les artifacts BMAD** : Brainstorming, Brief, PRD, Architecture, UX, Tests, Specs, Epics, Stories, Decisions, Cérémonies.
- **Dashboard de santé des artifacts** : Complétude (est-ce que l'artifact est complet ?), liens entre artifacts (PRD -> Archi -> Stories), statut de sync avec le code.
- **Traceability Matrix** : Vue linéaire ou graphique montrant le lien `Idée/Brief -> PRD -> Archi/UX -> Stories -> PRs -> Tests`.

### 3.2. Team Sync & Contributors Views

- **Vue générale Git + BMAD** : État global du repo (branches, PRs, sync status).
- **Vues par contributeur** : Grille des contributeurs avec indicateur de statut :
  - 🟢 **Connected / Live sync** : statut chargé depuis le repo local ou état Git live.
  - 🟡 **Absent / Cached state** : statut chargé depuis la dernière image/sync connue du repo.
- **Mécanisme de Claim déterministe** : Commande ou action `bmad claim <us-id> --remote-check` pour réserver une User Story, avec vérification remote pour éviter les double-claims.

### 3.3. Sprint & Ceremony Dashboard

- **Status Sprint** : Progression (stories done vs total), dates, objectifs.
- **Cérémonies** : Liste des cérémonies (standup, planning, review, retro) avec statut (upcoming, completed, missed) et liens vers les artifacts de notes.
- **Graphiques détermisiques** : Burn-down chart, velocity chart, générés à partir des données d'artifacts et d'activité Git.

### 3.4. Risk & Quality Signals

- **Signalétiques de risque** : Stories stales (in-progress sans activité > 3j), modules à haut risque de conflit Git, PRs en attente de review > 48h.
- **Quality Gates** : Vérification déterministe des standards BMAD (specs présentes, PRs reviewed, tests liés).

### 3.5. BMad AI Copilot (LLM Integration)

*L'IA agit comme une interface intelligente sur les données déterministes du projet (Claude / GitHub Copilot).*

- **Assistant de Rédaction (Artifact Creator)** : Aide à la rédaction de contenus (PRD, Specs, Stories) via un chat. L'IA propose des brouillons qui doivent être validés et enregistrés par l'utilisateur pour maintenir l'intégrité des fichiers.
- **Interface de Querying (RAG)** : Permet d'interroger l'état du projet en langage naturel (ex: *"Quel est le statut de la story #12 ?"*) en utilisant l'indexation déterministe du projet.
- **Coach de Méthodologie** : Aide à l'utilisation de la méthode BMad et au respect des standards de qualité.

## 4. Non-Features / Out of Scope for MVP

- **Génération LLM pour la syncro ou le claim** : Toutes les opérations de sync, claim, et vérification d'état sont 100% déterministes (scripts CLI, parsing fichiers, commandes Git).
- **Infrastructure cloud externe** : Le portail repose sur des fichiers locaux, Git, et un serveur de dashboard web local ou app web générée localement.

## 5. Architecture & Technical Constraints

- **Data Layer** : Scan et indexation des fichiers BMAD (Markdown, YAML, JSON) + état Git (branches, PRs, commits).
- **Sync Engine** : Scripts CLI `bmad sync`, `bmad claim --remote-check`, `bmad sprint status` produisant des rapports JSON/Markdown.
- **UI / Portal Layer** : Application web (ex: React/Next.js ou dashboard HTML généré) affichant les catalogues, graphiques, et vues rôle-dépendantes.
- **Deterministic by design** : Zéro dépendance à un modèle LLM pour les fonctionnalités de cœur (sync, claim, statut, graphiques).
- **AI Integration (RAG Mode)** : L'IA fonctionne en mode "Read-Only" sur les données d'indexation déterministes. Toute modification d'artifact suggérée par l'IA doit être soumise à une validation humaine (Draft $\rightarrow$ Commit) avant d'être persistée sur le disque.

## 6. Success Metrics / Acceptance Criteria

- [ ] Le portail indexe et affiche la santé de tous les types d'artifacts BMAD majeurs (Brief, PRD, Archi, UX, Stories, Tests...).
- [ ] La vue contributeur montre correctement l'état "Connected/Live" vs "Absent/Cached".
- [ ] Le mécanisme de claim US vérifie l'état remote et empêche les double-claims.
- [ ] Le dashboard Sprint affiche les graphiques deterministes (burn-down, velocity) et la liste des cérémonies.
- [ ] Les signaux de risque et quality gates sont calculés et affichés sans appel LLM.
- [ ] L'IA Copilot est capable de répondre à des questions sur l'état du projet via l'indexation (RAG).
- [ ] Toute modification de fichier suggérée par l'IA nécessite une validation explicite de l'utilisateur.

---

## Open Questions & Assumptions

### [ASSUMPTION] 1: Stack technique UI
*Il est assumé que l'UI du portail sera développée avec une stack web moderne (React/Next.js ou équivalent) avec une librairie de graphiques comme Chart.js ou Recharts pour les visualisations.*

### [ASSUMPTION] 2: Authentification & Rôles
*Il est assumé que l'authentification initiale sera simple (locale ou via un provider standard comme GitHub OAuth) et que les rôles (Dev, PM, Tech Lead, QA) seront déduits des permissions d'accès au repo ou configurés manuellement dans un fichier de configuration.*

### [NOTE FOR PM] 1: Commercialisation future
*Le portail est conçu pour un usage interne initialement, mais l'architecture doit permettre une éventuelle commercialisation future. Cela implique de penser à la multi-tenancy, à la gestion des licences, et à une documentation utilisateur claire.*
