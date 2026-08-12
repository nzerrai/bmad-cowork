---
title: "BMad Portal - The Distributed Collaborative Hub"
status: final
created: 2026-08-01
updated: 2026-08-12
---

> **Révision 2026-08-12 :** intégration des décisions d'implémentation actées — §3.1 (listes de repos user-scoped sur le dashboard avec `SpaceMembership`, admin voit tous les repos), §3.4 (redirection post-login vers `/hub/dashboard` au lieu de `/artifacts`), et IHM (icône de barre d'activité VS Code pour ouvrir le dashboard). Le contenu documente des fonctionnalités déjà implémentées dans les specs `spec-dashboard-user-scoped-repos-list.md`, `spec-hub-login-redirect-to-dashboard.md`, et `spec-vscode-dashboard-activity-bar-icon.md` — ce n'est pas un changement de scope.

> **Révision 2026-08-06 :** backport de décisions actées en aval (epics.md/UX) suite au rapport d'Implementation Readiness du 2026-08-06 — §3.3 (seuils de risque chiffrés, modules à risque de conflit Git), nouveau §3.5 (Sprint & Ceremony Tracking), §5 (exigences d'accessibilité), §6 (latence de sync quantifiée). Le contenu ajouté documente des décisions déjà mises en œuvre dans `epics.md` et les docs UX ; ce n'est pas un changement de scope.

# 📄 PRD: BMad Portal - The Distributed Collaborative Hub

## 🎯 1. Overview & Purpose

**Project Name:** BMad Portal (Hub)  
**Objective:** To provide a high-performance, distributed platform that unifies the management of BMad artifacts, team synchronization (local vs. remote), contributor status, and sprint tracking.

**Current MVP scope excludes the AI Copilot** (drafting assistant, RAG querying, methodology coach) — deferred to a later phase, see §7. The MVP focuses on the deterministic core: artifact indexing, team sync, sprint tracking, and quality signals.

**Core Philosophy:**
* **Distributed Authority:** The platform operates on a three-tier model: a local Agent (Client Python), a centralized Orchestration Hub (Backend), and a visual Command Center (IHM).
* **Deterministic Truth:** The single source of truth is the combination of **BMad Artifacts + Git State**.

---

## 👥 2. Target Users & Roles

| Role | Focus |
| :--- | :--- |
| **Developer (Dev)** | Local/Remote sync, claim management, task visibility, Git-based workflows. |
| **Product Manager (PM)** | Roadmap, sprint status, artifact health, risk signals. |
| **Architect / Tech Lead** | Traceability matrix, compliance, dependency management, architecture-to-code link. |
| **UX Designer** | User journey flow,-artifact visual consistency, design-to-spec compliance. |
| **Admin** | Project configuration (Git/Repos), User/Role management, platform governance. |

---

## ✨ 3. Core Features (MVP Scope)

### 3.1. Core Connection Flow
* **Login as Entry Point:** The login page is the entry point to the HUB. After successful connection, users are redirected to the dashboard.
* **Client/Extension Connection:** The Python client or VS Code extension connects using the user's token and the local repository from which the connection is made.
* **User + Repo Association:** The HUB records the association between the user and the repository. For a new repository, the HUB registers it and triggers a read of the remote repository.
* **Latest Status Recording:** The client or extension periodically sends the status of their local repositories to the HUB. The HUB simply stores the latest status — branch, ahead/behind counts, and in-progress actions — without maintaining complex history or staleness calculations.

### 3.2. User Story Claims
* **Story Claiming:** Users can claim User Stories for development. The HUB tracks which user is currently working on which story based on the latest status reports from clients/extensions.

### 3.3. Git Status & User Activity
* **Latest Status Recording:** The HUB simply records the latest status from each connected client/extension — branch, ahead/behind counts, and in-progress actions. No complex history or staleness calculations are maintained.
* **User Connection Status:** The dashboard shows which users are currently connected to or have previously connected to a given repository.
* **Development State:** Display of User Stories in development and basic Git delta (ahead/behind) for each repository.

### 3.4. Core User Journeys (Golden Paths)
* **The Dev Loop:** *Local Change $\rightarrow$ Git Commit $\rightarrow$ Status Sync to Hub.*
* **The Dashboard View:** *Login $\rightarrow$ Select Repository $\rightarrow$ View connected users, Git status, and US in development.*

### 3.5. Sprint & Ceremony Tracking
* **Sprint Status:** Progression of stories done vs. total, sprint dates, and objectives, with completion percentage.
* **Ceremonies:** A list of ceremonies (standup, planning, review, retro) with status (upcoming/completed/missed) and links to their notes artifacts.
* **Deterministic Charts:** Burn-down and velocity charts generated deterministically from artifact and Git activity data — no AI/LLM involvement, consistent with the platform's Deterministic Truth philosophy (§1).

### 3.6. Dashboard & Repo Listing
* **Login as Entry Point:** After successful login, users are redirected to `/hub/dashboard` (the Hub dashboard) instead of `/artifacts`.
* **User-Scoped Repos List:** The `/hub/dashboard` overview displays a list of repositories attached to the connected user. For regular users, this includes only the repos they are attached to (via the `SpaceMembership` model). For administrators, it displays all repos in the HUB.
* **Status de chaque repo local:** Pour chaque repository dans la liste, le dashboard affiche :
  - La remote repository information
  - Le status Git actuel (branche, ahead/behind counts) envoyé par le client/extension local
  - Les utilisateurs actuellement connectés ou ayant précédemment connecté à cette repository
  - Les User Stories en développement liées à cette repository
* **Latest Status Only:** The HUB stores simply the latest status from each connected client/extension — no complex history or staleness tracking is maintained.

---

## 🏗️ 4. Architecture & Technical Constraints

### 4.1. Three-Tier Architecture
1.  **Client (Agent):** A lightweight Python-based CLI/Service running on the developer's machine. It performs local file scanning, Git operations, and acts as the local interface to the Backend.
2.  **Backend (The Hub):** A centralized FastAPI server managing the state, the WebSocket connections, and the Git integration. (Knowledge Graph deferred with §7.)
3.  **IHM (The Command Center):** A web-based React/Next.js dashboard for high-level management and real-time visualization.

### 4.2. Technical Stack (Proposed)
* **Backend:** Python (FastAPI), PostgreSQL (with JSONB for metadata), WebSockets. `pgvector` deferred with the AI Copilot (see §7).
* **Client:** Python (CLI/Service).
* **IHM:** React / Next.js with real-time charting (Recharts/D3).
* **Data Layer:** Graph-based indexing of Markdown/YAML/JSON artifacts.
* **VS Code Extension:** VS Code webview dashboard with an activity bar icon container (`viewsContainers.activitybar`) for one-click access to the `bmadPortal.dashboard` view, using standard VS Code contribution points (`viewsContainers.activitybar` and `views`).

---

## ⚖️ 5. Constraints & Guardrails

* **Simple Status Recording:** The HUB stores only the latest status from each connected client/extension — no complex history or staleness tracking is maintained.
* **Isolation:** The Client/Extension remains the only entity with direct access to the user's local filesystem and Git operations.
* **Automated Auditability:** Critical state transitions (user+repo associations, status updates) must be logged to ensure a human-readable, verifiable history of platform events.
* **Accessibility:** All operational status indicators must meet WCAG AA contrast on the platform's background/surface colors. Full keyboard accessibility is required for complex data tables and command menus, with tab order following visual reading order on every surface.
* **AI Guardrails (apply when §7 is picked back up):** AI is never allowed to perform deterministic-core actions autonomously. Human-in-the-loop (HITL) — all AI-generated content must pass through a "Draft $\rightarrow$ Review $\rightarrow$ Commit" cycle.

---

## 📈 6. Success Metrics

* **Simple Status Accuracy:** The dashboard accurately reflects the latest status sent by connected clients/extensions for each repository.
* **User Visibility:** Users can easily see which repositories they are attached to, and admins can see all repositories in the HUB.
* **Dashboard Clarity:** The dashboard provides clear information about repository status, connected users, and User Stories in development.

---

## 🔜 7. Post-MVP (Deferred): AI Copilot

Deferred as of 2026-08-05 — not dropped, revisited once the deterministic core (§3.1–3.4) ships.

### 7.1. AI Copilot (The Method-Aware Assistant)
* **Drafting Mode:** The AI proposes content (PRD, Stories, Specs) following BMad templates. Proposals are treated as "Drafts" and must be manually approved/committed by the user.
* **Provenance-Linked Graph-RAG:** The AI uses a Knowledge Graph (mapping relations like `Story -> implements -> PRD`) to answer complex questions. Every reasoning step must be anchored to specific file paths and Git hashes to ensure deterministic truth.
* **Methodology Compliance (Actor-Critic):** A dual-agent pattern where one agent proposes content and a second "Auditor" agent verifies it against BMad quality gates.

### 7.2. Deferred Technical Dependencies
* `pgvector` extension on PostgreSQL (RAG embeddings).
* Knowledge Graph layer in the Backend.
* AI-driven querying surface in the IHM.

### 7.3. Guardrails to Reinstate When Picked Back Up
* AI never performs deterministic-core actions (claiming, status updates, synchronization) autonomously.
* Human-in-the-loop (HITL): all AI-generated content passes through a "Draft $\rightarrow$ Review $\rightarrow$ Commit" cycle.
