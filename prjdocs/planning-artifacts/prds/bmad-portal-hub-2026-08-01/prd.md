---
title: "BMad Portal - The Distributed Collaborative Hub"
status: final
created: 2026-08-01
updated: 2026-08-06
---

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

### 3.1. The Three Pillars of Synchronization
* **Local Repo Pillar:** The Client Python agent scans the user's local directory to detect BMad-specific markers and current Git state — including the connected remote repository identity and local drift signals (commits ahead/behind, in-progress Git actions such as rebase/merge/conflict).
* **WebSocket Pillar (The Nervous System):** Real-time, bidirectional communication between the Backend and all connected Clients/IHM. Used for presence, instant notifications, command dispatching, and — piggybacked on the same heartbeat — local repo state reporting (see below).
* **Remote Repo Pillar (The Law):** The Backend serves as the bridge to the remote Git repository, acting as the final arbater for claims and state changes. The remote repository's identity also serves as the platform's unique application identifier (see Zero-Setup Onboarding below).

* **Zero-Setup Onboarding & Application Identity:** On launch, the Client automatically identifies itself via the connected remote repository. The technical identifier is the full remote path (host/org/repo) to guarantee uniqueness; the dashboard displays the short repo name, with an org badge/tooltip shown only when two spaces share the same short name. The first Client to report an unrecognized identity triggers automatic creation of the corresponding HUB space; subsequent Clients with the same identity join it automatically — there is no manual "create space" step. If the Backend does not yet have read access to that repository, the space is still created (status `pending`, distinct from `active` and `access_revoked`) and the connecting developer receives an actionable prompt — a direct link to grant access, scoped to the project's Git provider, with a generic text fallback if the provider can't be determined — rather than a silent failure.

  > **[NOTE FOR PM]** Zero-config auto-onboarding is an assumed design bet, not a validated user need. Build the minimal version and hold off extending it until real onboarding friction is observed.

* **Local Repo State Reporting:** The Client continuously reports local Git drift and in-progress actions to the Backend — pushed immediately on local Git events (e.g. via a Git hook) with a 10-second (configurable) safety tick as fallback. This single stream of raw state feeds both contributor status visibility and the Risk & Quality Signals (§3.3) — one source, multiple consumers.

### 3.2. Distributed Claim & Sync Mechanism
* **Lease-based Claiming:** A contention-free mechanism where the Backend issues time-limited "leases" for User Stories. To prevent zombie claims during disconnects, Clients must maintain a heartbeat via WebSockets; if the heartbeat fails, the lease expires and the Backend automatically releases the claim.
* **Auto-Healing Sync:** When a claim is rejected or a conflict is detected, the Client is automatically signaled to synchronize its state with the Backend/Remote Repo.

### 3.3. Risk & Quality Signals
* **Git Drift Detection:** Monitoring the divergence between local repositories and the remote source of truth, fed continuously by the Local Repo State Reporting stream (§3.1).
* **Stale Task Signals:** Identifying stories in-progress without activity for **more than 3 days**, and PRs awaiting review for **more than 48 hours**.
* **High-Risk Git Conflict Modules:** Surfacing modules/paths with an elevated likelihood of merge conflict, derived from the same Git Drift Detection stream (§3.1) — e.g. multiple contributors with local drift touching overlapping paths.
* **Compliance Gates:** Automated checking of artifact completeness and structural adherence to BMad standards, with a compliance score broken down per section rather than a single pass/fail.

### 3.4. Core User Journeys (Golden Paths)
* **The Dev Loop:** *Local Change $\rightarrow$ Git Commit $\rightarrow$ Auto-Sync to Hub.*
* **The PM Pulse:** *Dashboard $\rightarrow$ Risk Signal Alert $\rightarrow$ One-click 'Re-sync' of stale stories.*
* **The Auditor's Audit:** *Select Artifact $\rightarrow$ Run BMad Compliance Gate $\rightarrow$ View Compliance Score.*

### 3.5. Sprint & Ceremony Tracking
* **Sprint Status:** Progression of stories done vs. total, sprint dates, and objectives, with completion percentage.
* **Ceremonies:** A list of ceremonies (standup, planning, review, retro) with status (upcoming/completed/missed) and links to their notes artifacts.
* **Deterministic Charts:** Burn-down and velocity charts generated deterministically from artifact and Git activity data — no AI/LLM involvement, consistent with the platform's Deterministic Truth philosophy (§1).

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

---

## ⚖️ 5. Constraints & Guardrails

* **Deterministic Core:** All critical operations (claiming, status updates, synchronization) are 100% deterministic and managed by the Backend/Git.
* **Isolation:** The Client remains the only entity with direct access to the user's local filesystem.
* **Automated Auditability:** All critical state transitions (claims, lease expiries, sync events) must be logged in the `.memlog.md` to ensure a human-readable, verifiable history of platform events.
* **Accessibility:** All operational status indicators must meet WCAG AA contrast on the platform's background/surface colors. Full keyboard accessibility is required for complex data tables and command menus, with tab order following visual reading order on every surface.
* **AI Guardrails (apply when §7 is picked back up):** AI is never allowed to perform deterministic-core actions autonomously. Human-in-the-loop (HITL) — all AI-generated content must pass through a "Draft $\rightarrow$ Review $\rightarrow$ Commit" cycle.

---

## 📈 6. Success Metrics

* **Zero Collision Rate:** No double-claims or state conflicts in a multi-user environment.
* **Sync Latency:** When the local Git hook fires, the Dashboard reflects the new state within the same second (no page reload). If the hook doesn't fire, the 10-second (configurable) safety tick is the fallback ceiling — latency degrades to that bound, nothing is lost.
* **Compliance Score:** Percentage of artifacts that pass the automated BMad quality gates.

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
