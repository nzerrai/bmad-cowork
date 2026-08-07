---
stepsCompleted: ["step-01-document-discovery", "step-02-prd-analysis", "step-03-epic-coverage-validation", "step-04-ux-alignment", "step-05-epic-quality-review", "step-06-final-assessment"]
documentsIncluded:
  prd: "prjdocs/planning-artifacts/prds/bmad-portal-hub-2026-08-01/prd.md"
  architecture: "prjdocs/planning-artifacts/architecture/architecture-bmad-portal-hub-2026-08-01/ARCHITECTURE-SPINE.md"
  ux:
    - "prjdocs/planning-artifacts/ux-designs/ux-tarmacacademy-2026-08-01/DESIGN.md"
    - "prjdocs/planning-artifacts/ux-designs/ux-tarmacacademy-2026-08-01/EXPERIENCE.md"
  epics: "prjdocs/planning-artifacts/epics.md"
excludedAsSuperseded:
  - "prjdocs/planning-artifacts/prds/prd-tarmacacademy-2026-07-30/prd.md"
  - "prjdocs/planning-artifacts/ux-designs/ux-tarmacacademy-2026-07-31/"
---

# Implementation Readiness Assessment Report

**Date:** 2026-08-06
**Project:** tarmacacademy (BMad Portal Hub)

## Document Inventory

### PRD Files Found

**Whole Documents:**
- `prds/prd-tarmacacademy-2026-07-30/prd.md` (6947 octets, modifié 2026-08-01) — titre "BMAD Portal MVP - Artifact & Team Sync Hub", statut `final`, `updated: 2026-08-01`
- `prds/bmad-portal-hub-2026-08-01/prd.md` (8646 octets, modifié 2026-08-05) — titre "BMad Portal - The Distributed Collaborative Hub", statut `final`, `updated: 2026-08-05`

**Sharded Documents:** aucun

### Architecture Files Found

**Whole Documents:**
- `architecture/architecture-bmad-portal-hub-2026-08-01/ARCHITECTURE-SPINE.md` (12527 octets, modifié 2026-08-06)

**Sharded Documents:** aucun

### Epics & Stories Files Found

**Whole Documents:**
- `epics.md` (31760 octets, modifié 2026-08-06)

**Sharded Documents:** aucun

### UX Design Files Found

**Whole Documents (dossiers) :**
- `ux-designs/ux-tarmacacademy-2026-07-31/` (DESIGN.md, EXPERIENCE.md — modifiés 2026-07-31)
- `ux-designs/ux-tarmacacademy-2026-08-01/` (DESIGN.md, EXPERIENCE.md, review-rubric.md — modifiés 2026-08-06)

**Sharded Documents:** aucun

### Autres artifacts pertinents trouvés
- `briefs/brief-tarmacacademy-2026-07-24/brief.md`
- `research/domain-outils-hermes-specification-fonctionnelle-research-2026-07-25.md`

## Issues Found

### ⚠️ CRITICAL ISSUE — PRD dupliqué
Deux PRD "whole" distincts existent pour ce projet :
- `prd-tarmacacademy-2026-07-30/prd.md` (ancien, `updated: 2026-08-01`)
- `bmad-portal-hub-2026-08-01/prd.md` (plus récent, `updated: 2026-08-05`)

**Preuve de résolution amont :** `epics.md` (frontmatter `inputDocuments`) et `ARCHITECTURE-SPINE.md` (frontmatter `sources`) référencent tous deux explicitement `prds/bmad-portal-hub-2026-08-01/prd.md`. Le PRD `prd-tarmacacademy-2026-07-30` semble être une version antérieure/supersédée du même produit (le scope, les rôles et la philosophie déterministe correspondent, mais le contenu diverge — ex. le Copilot IA est explicitement différé au §7 dans la version du 08-01, pas dans celle du 07-30).

**Recommandation :** utiliser `bmad-portal-hub-2026-08-01/prd.md` comme PRD de référence pour cette évaluation, et archiver/renommer `prd-tarmacacademy-2026-07-30/` pour éviter toute confusion future.

### ⚠️ CRITICAL ISSUE — UX dupliqué
Deux dossiers UX "whole" existent, tous deux nommés `ux-tarmacacademy-*` :
- `ux-tarmacacademy-2026-07-31/` (ancien)
- `ux-tarmacacademy-2026-08-01/` (plus récent, DESIGN.md/EXPERIENCE.md modifiés le 2026-08-06)

**Preuve de résolution amont :** `epics.md` et `ARCHITECTURE-SPINE.md` référencent tous deux `ux-designs/ux-tarmacacademy-2026-08-01/DESIGN.md` et `EXPERIENCE.md`.

**Recommandation :** utiliser `ux-tarmacacademy-2026-08-01/` comme UX de référence, et archiver/renommer `ux-tarmacacademy-2026-07-31/`.

### Pas de doublon détecté
- Architecture : un seul document trouvé.
- Epics & Stories : un seul document trouvé.

## Documents retenus pour l'évaluation (en attente de confirmation utilisateur)

- **PRD :** `prds/bmad-portal-hub-2026-08-01/prd.md`
- **Architecture :** `architecture/architecture-bmad-portal-hub-2026-08-01/ARCHITECTURE-SPINE.md`
- **UX :** `ux-designs/ux-tarmacacademy-2026-08-01/DESIGN.md` + `EXPERIENCE.md`
- **Epics & Stories :** `epics.md`

---

## PRD Analysis

*Source : `prds/bmad-portal-hub-2026-08-01/prd.md`, lu intégralement.*

**Légende de traçabilité :** ✅ explicite dans le PRD · 🔶 implicite / dérivé du PRD (formulation étendue en aval) · ⚠️ non traçable au texte du PRD (introduit en aval, dans `epics.md` et/ou l'architecture)

### Functional Requirements

FR1: Indexer tous les artifacts BMAD (Brainstorming, Brief, PRD, Architecture, UX, Tests, Specs, Epics, Stories, Décisions, Cérémonies) — 🔶 dérivé de l'Objective §1 ("unifies the management of BMad artifacts") ; la liste exhaustive des 11 types n'apparaît nulle part dans le PRD.
FR2: Dashboard de santé des artifacts (complétude, liens, statut de sync avec le code) — 🔶 dérivé de la ligne PM §2 ("artifact health") et Architect §2 ("compliance").
FR3: Traceability Matrix (Idée/Brief → PRD → Archi/UX → Stories → PRs → Tests) — 🔶 le PRD mentionne "Traceability matrix" pour le rôle Architect (§2) mais sans détailler la chaîne complète.
FR4: Scan local + détection état Git (remote identity, drift ahead/behind, actions en cours) — ✅ explicite §3.1 Local Repo Pillar.
FR5: Communication temps réel bidirectionnelle WebSocket (présence, notifications, dispatch, reporting) — ✅ explicite §3.1 WebSocket Pillar.
FR6: Backend = pont vers le remote, arbitre en dernier ressort — ✅ explicite §3.1 Remote Repo Pillar.
FR7: Auto-identification du Client via le remote, badge de collision sur nom court — ✅ explicite §3.1 Zero-Setup Onboarding.
FR8: Création/jonction automatique de l'espace HUB — ✅ explicite §3.1.
FR9: Statut `pending` + prompt d'accès actionnable — ✅ explicite §3.1.
FR10: Reporting continu du drift Git (hook immédiat + tick 10s configurable) — ✅ explicite §3.1 Local Repo State Reporting.
FR11: Lease-based claiming + heartbeat, expiration auto (60s) — ✅ explicite §3.2.
FR12: Auto-Healing Sync sur rejet/conflit — ✅ explicite §3.2.
FR13: Dashboard Overview/Health (vue globale Git + BMAD) — 🔶 dérivé du golden path "Dev Loop"/"PM Pulse" (§3.4) et de la ligne PM §2, sans section §3.x dédiée.
FR14: Vues par contributeur, statut à deux signaux indépendants (presence / sync-state) — ⚠️ le détail des deux axes orthogonaux et la palette à 6 valeurs proviennent de l'Architecture Spine (AD-009), pas du PRD, qui ne mentionne que "contributor status" de façon générique.
FR15: Panneau Détail Contributeur (Fiche Contributeur) — 🔶 aucune section §3.x dédiée ; dérivé de "contributor status" (Objective §1) et des docs UX.
FR16: Action `[Re-sync]` en un clic — ✅ explicite §3.4 golden path "PM Pulse".
FR17: Status Sprint (progression, dates, objectifs) — 🔶 seule mention : "sprint tracking" (§1) / "sprint status" (§2, rôle PM) ; pas de section §3.x dédiée.
FR18: Cérémonies (standup, planning, review, retro) avec statuts — ⚠️ **aucune trace textuelle dans le PRD** (aucune occurrence de "ceremony/cérémonie", "standup", "planning", "review", "retro").
FR19: Graphiques déterministes (burn-down, velocity) — ⚠️ aucune trace textuelle explicite ; dérivé indirectement de "sprint tracking".
FR20: Signaux de risque (stories stale > 3j, modules à haut risque de conflit Git, PRs en attente > 48h) — 🔶/⚠️ "Stale Task Signals" et "Git Drift Detection" sont explicites (§3.3) mais **sans seuils chiffrés** ; le concept "modules à haut risque de conflit Git" n'apparaît nulle part dans le PRD.
FR21: Quality Gates avec score de compliance détaillé par section — ✅ explicite §3.3 Compliance Gates + §6 Success Metrics (Compliance Score).
FR22: Administration Système (config projet, users/rôles, gouvernance) — ✅ explicite §2, ligne Admin.
FR23: Notifications instantanées non intrusives (WebSocket toasts) — 🔶 "instant notifications" mentionné génériquement §3.1 ; le détail "toast non intrusif" est une précision UI en aval.

**Total FRs : 23** (17 tracées ou dérivées du PRD, 6 marquées ⚠️ nécessitant vérification de la source)

### Non-Functional Requirements

NFR1: 100% déterministe, zéro appel LLM pour sync/claim/vérification d'état — ✅ explicite §5 (Deterministic Core).
NFR2: Scan et indexation des fichiers BMAD (MD/YAML/JSON) + état Git — ✅ explicite §4.2 (Data Layer).
NFR3: Application web (React/Next.js) avec vues rôle-dépendantes — ✅ explicite §4.1 (IHM) + §2 (rôles).
NFR4: Isolation — seul le Client a accès direct au filesystem local — ✅ explicite §5.
NFR5: Auditabilité — transitions d'état critiques journalisées dans `.memlog.md` — ✅ explicite §5.
NFR6: Latence de sync minimale entre événement Git et représentation Dashboard — 🔶 concept explicite (§6 Success Metrics) mais **non quantifié** — aucun seuil chiffré, contrairement aux autres délais du PRD (heartbeat 60s, tick 10s).
NFR7: Zero Collision Rate — aucun double-claim / conflit d'état — ✅ explicite §6.
NFR8: Contraste WCAG AA pour les indicateurs de statut — ⚠️ source = docs UX uniquement ; le PRD ne mentionne aucune exigence d'accessibilité.
NFR9: Accessibilité clavier complète (tables, menus) — ⚠️ source = docs UX uniquement ; absente du PRD.

**Total NFRs : 9** (7 tracées, 2 sourcées uniquement de l'UX sans backing PRD)

### Additional Requirements

- Architecture 3-tiers explicite (§4.1) : Client (Python CLI/Service), Backend (FastAPI), IHM (React/Next.js).
- Stack technique explicite (§4.2) : PostgreSQL + JSONB, WebSockets ; `pgvector` explicitement différé avec le Copilot IA.
- AI Guardrails (§5, applicable seulement à la reprise du §7) : pas d'action déterministe-core autonome par l'IA ; cycle Draft → Review → Commit obligatoire.
- **Risque auto-déclaré par le PRD lui-même** (note PM, §3.1) : le Zero-Setup Onboarding est qualifié de "pari de conception assumé, pas un besoin utilisateur validé" — construire la version minimale et ne pas étendre avant observation de friction réelle. À surveiller comme risque de scope, pas comme gap.
- §7 Post-MVP (Copilot IA) : explicitement et clairement hors scope MVP, différé le 2026-08-05. Correctement exclu du périmètre `epics.md`.

### PRD Completeness Assessment

1. **Cœur Sync/Claim/Risk bien spécifié.** Les sections §3.1–3.4 sont détaillées, avec des seuils chiffrés concrets (heartbeat 60s, tick de reporting 10s configurable) — bon niveau de testabilité.
2. **Trois zones fonctionnelles reposent sur une base textuelle PRD ténue ou absente**, alors qu'elles deviennent chacune un Epic complet en aval :
   - **Epic 1 (Artifact Health & Traceability Catalog, FR1–3)** — aucune section §3.x dédiée ; dérivé d'une phrase de l'Objective et d'une ligne de tableau de rôle.
   - **Epic 4 (Sprint & Ceremony Dashboard, FR17–19)** — "sprint tracking" est cité comme objectif (§1) mais jamais développé en section de fonctionnalité ; les **cérémonies (FR18) n'ont aucune trace textuelle dans le PRD**.
   - **FR15 (Fiche Contributeur)** — pas de section §3.x dédiée, dérivé indirectement de "contributor status".
3. **NFR de latence non quantifié** (NFR6) — contraste avec le reste du document qui chiffre systématiquement ses seuils temporels ailleurs.
4. **Deux éléments de `epics.md` sans ancrage PRD identifiable** : "modules à haut risque de conflit Git" et les seuils numériques 3j/48h de FR20. À confirmer : décision prise lors du sprint planning en aval, ou lacune du PRD à combler rétroactivement.
5. **Accessibilité (NFR8/NFR9) portée uniquement par l'UX**, absente du PRD — risque que ces exigences soient perdues si les docs UX évoluent sans que le PRD serve de garde-fou.
6. Le PRD auto-documente honnêtement l'incertitude sur le Zero-Setup Onboarding — bonne pratique, à conserver comme item de risque plutôt que de gap.

Ces six points seront croisés avec la couverture epics à l'étape suivante pour déterminer s'ils constituent des blocages réels à l'implémentation.

---

## Epic Coverage Validation

*Source : `epics.md`, lu intégralement (6 epics, 21 stories) — section "FR Coverage Map" + AC de chaque story.*

### Coverage Matrix

| FR | Epic / Story | Statut |
| --- | --- | --- |
| FR1 | Epic 1 / Story 1.1 | ✓ Covered |
| FR2 | Epic 1 / Story 1.2 | ✓ Covered |
| FR3 | Epic 1 / Story 1.3 | ✓ Covered |
| FR4 | Epic 2 / Story 2.2 | ✓ Covered |
| FR5 | Epic 2 / Story 2.1 | ✓ Covered |
| FR6 | Epic 2 / Story 2.1 (AC combinée avec FR5) | ✓ Covered |
| FR7 | Epic 2 / Story 2.3 | ✓ Covered |
| FR8 | Epic 2 / Story 2.3 (AC combinée avec FR7) | ✓ Covered |
| FR9 | Epic 2 / Story 2.4 | ✓ Covered |
| FR10 | Epic 2 / Story 2.5 | ✓ Covered |
| FR11 | Epic 3 / Story 3.1 | ✓ Covered |
| FR12 | Epic 3 / Story 3.2 | ✓ Covered |
| FR13 | Epic 3 / Story 3.3 | ✓ Covered |
| FR14 | Epic 3 / Story 3.4 | ✓ Covered |
| FR15 | Epic 3 / Story 3.5 | ✓ Covered |
| FR16 | Epic 3 / Story 3.6 | ✓ Covered |
| FR17 | Epic 4 / Story 4.1 | ✓ Covered |
| FR18 | Epic 4 / Story 4.2 | ✓ Covered |
| FR19 | Epic 4 / Story 4.3 | ✓ Covered |
| FR20 | Epic 5 / Story 5.1 | ✓ Covered |
| FR21 | Epic 5 / Story 5.2 | ✓ Covered |
| FR22 | Epic 6 / Stories 6.1 + 6.2 | ✓ Covered |
| FR23 | Epic 3 / Story 3.7 | ✓ Covered |

### Missing Requirements

Aucune. Les 23 FR du PRD ont une story de destination explicite avec Acceptance Criteria dédiés.

### FRs présents dans les epics mais non ancrés au texte du PRD

Conformément au protocole ("note any FRs in epics but NOT in PRD"), les écarts identifiés à l'étape PRD Analysis sont confirmés ici au niveau story — ce ne sont pas des trous de couverture (les stories existent et sont bien conçues), mais des **additions de contenu sans traçabilité PRD amont**, à faire valider explicitement :

- **FR18 / Story 4.2 (Cérémonies)** — le concept entier (standup/planning/review/retro, statuts upcoming/completed/missed) est absent du PRD. La story est cohérente et bien écrite, mais rien dans le PRD ne la motive ou ne la scope.
- **FR20 / Story 5.1 (seuils de risque)** — "modules à haut risque de conflit Git" et les seuils chiffrés (> 3 jours, > 48h) sont présents dans l'AC de la story sans source PRD. Risque : ces seuils deviennent des engagements de fait (testables, donc contractuels) alors qu'ils n'ont jamais été validés/discutés au niveau PRD.
- **FR14 / Story 3.4 (modèle presence/sync-state à deux axes)** — le modèle à deux signaux orthogonaux vient de l'Architecture Spine (AD-009), pas du PRD, qui ne parle que de "contributor status" générique. Traçable à l'architecture donc pas un problème de fond, mais le PRD lui-même ne couvre pas ce niveau de détail comportemental.

**Recommandation :** ces trois éléments ne bloquent pas l'implémentation (ils sont bien spécifiés et actionnables), mais devraient être **rétro-documentés dans le PRD** (ou au minimum confirmés explicitement par le PM comme décisions actées) pour que le PRD reste la source de vérité amont et ne soit pas silencieusement dépassé par les epics.

### Coverage Statistics

- Total PRD FRs : 23
- FRs couverts dans les epics : 23
- **Taux de couverture : 100%**
- FRs présents dans les epics sans ancrage PRD explicite : 3 (FR14, FR18, FR20) — non bloquant, à documenter en retour

---

## UX Alignment Assessment

*Sources : `ux-designs/ux-tarmacacademy-2026-08-01/DESIGN.md` + `EXPERIENCE.md`, croisés avec le PRD et `ARCHITECTURE-SPINE.md`.*

### UX Document Status

**Found.** UX très mature : design tokens complets (couleurs, typo, spacing), 9 composants documentés, 6 surfaces d'Information Architecture, patterns d'état par surface (Empty/Cold-load/Error/Permission-denied), 4 flux utilisateurs détaillés avec cas d'échec explicites. `ARCHITECTURE-SPINE.md` cite explicitement DESIGN.md et EXPERIENCE.md comme sources (frontmatter `sources:`), et EXPERIENCE.md cite le PRD et `epics.md`. La boucle de traçabilité documentaire est exceptionnellement bien bouclée pour ce projet.

### A. UX ↔ PRD Alignment

- **Bon alignement général** : les 4 Key Flows d'EXPERIENCE.md citent explicitement leurs sections PRD sources (§3.1, §3.3, §3.7 mentionné implicitement). La surface "Artifact Management" (Knowledge Graph/RAG) est correctement marquée *Post-MVP, différée avec le Copilot IA (PRD §7)* — cohérent avec l'exclusion de scope du PRD et l'absence d'epic correspondante.
- **⚠️ Citation PRD inexacte détectée** : Flow 2 ("The PM Pulse") dans EXPERIENCE.md indique *"2 stories flagged stale (>3 days no activity, PRD §3.3)"*. Or, comme identifié à l'étape PRD Analysis, le §3.3 du PRD ("Stale Task Signals: Identifying inactive stories or unreviewed PRs") **ne contient aucun seuil chiffré**. Le seuil de 3 jours est une invention en aval (probablement lors de la création d'epics.md/FR20), à laquelle l'UX fait ensuite référence comme si elle provenait du PRD. Ce n'est pas une erreur bloquante — le seuil est cohérent partout (epics.md, UX) — mais la citation elle-même est fausse et casse la chaîne de traçabilité si quelqu'un vérifie la source.

### B. UX ↔ Architecture Alignment

- **Alignement exceptionnellement fort** sur le cœur du produit : AD-009 référence explicitement `UX-DR5` (Status Pill) et implémente précisément la règle de collapse presence/sync-state décrite dans EXPERIENCE.md ; AD-008 fixe le seuil de staleness à 30s, qui correspond exactement au comportement décrit pour le Contributor Detail Panel dans EXPERIENCE.md ; AD-002 (60s heartbeat timeout) correspond au Flow 4. Le "Capability → Architecture Map" de la spine couvre explicitement FR1–FR23.
- **⚠️ Surface UX sans ancrage architecture explicite : "Synchronization Center".** EXPERIENCE.md liste "Synchronization Center" comme l'une des 6 surfaces de navigation globale de premier niveau ("Visualizing drift, Git status, and WebSocket connectivity"), avec ses propres états Empty/Cold-load/Error dans le tableau "UI-lifecycle states per surface". Cependant :
  - Le "Capability → Architecture Map" de `ARCHITECTURE-SPINE.md` ne mentionne cette surface nulle part comme capability gouvernée.
  - `epics.md` n'a **aucune story dédiée** à "Synchronization Center" — le contenu décrit (drift, statut Git, connectivité WebSocket) chevauche fortement la Story 3.3 "Dashboard Overview/Health", mais rien ne confirme explicitement que Story 3.3 = cette surface, ou qu'elle a été fusionnée intentionnellement avec le Dashboard, ou tout simplement oubliée lors du découpage en stories.
  - **Risque d'implémentation :** un développeur pourrait soit construire deux écrans redondants, soit en oublier un, faute d'une story qui tranche explicitement la question.
  - **Recommandation :** clarifier avant Phase 4 — soit ajouter une story explicite "Synchronization Center" à Epic 2 ou 3, soit documenter dans EXPERIENCE.md/epics.md que cette surface est fusionnée avec le Dashboard Overview/Health.

### Warnings

Aucun avertissement de type "UX manquant" : la documentation UX est présente et substantiellement au-dessus du niveau minimal attendu à ce stade.

---

## Epic Quality Review

*Revue rigoureuse des 6 epics et 21 stories de `epics.md` contre les standards create-epics-and-stories : valeur utilisateur, indépendance, dépendances, complétude.*

### Constat général (positif)

- **Aucune dépendance en avant (forward dependency) détectée.** L'ordre 1 → 2 → 3 → 4 → 5 → 6 est respecté : chaque epic ne s'appuie que sur la sortie d'epics numérotés plus bas (ex. Epic 3/5 consomment le flux AD-008 posé par Epic 2 ; aucune story n'anticipe une capacité d'un epic ultérieur).
- La majorité des stories ont un persona clair (Developer, PM, Team Member, Admin, QA/Reviewer) et un format Given/When/Then correctement appliqué.
- Plusieurs stories (3.3, 3.5, 3.6, 5.2, 6.1, 6.2) modélisent explicitement des cas d'échec/limite (heartbeat périmé, échec partiel de re-sync, référence cassée, déconnexion Backend) — c'est le niveau de rigueur attendu et il devrait être la norme, pas l'exception (voir Majeur #4 ci-dessous).

### 🔴 Critical Violations

**1. Aucune story fondatrice pour l'authentification / RBAC.**
Chaque epic gated par rôle (Epic 6 en particulier) *suppose* un système d'identité déjà existant — Story 6.1 démarre par "Given I am authenticated with the Admin role" — mais **aucune story, dans aucun epic, ne construit l'authentification, la gestion de session, ou l'application du RBAC** elle-même. "Identity/Auth via RBAC" n'apparaît que comme une ligne dans "Additional Requirements" de `epics.md`, jamais comme une story implémentable. C'est un prérequis transverse à presque tout le produit (rôles PM/Dev/Architecte/Admin partout dans le PRD) et son absence bloque concrètement le démarrage de l'implémentation.
**Recommandation :** ajouter une story d'amorçage (probablement Epic 2 ou un nouvel Epic 0) : "En tant que Développeur/Utilisateur, je veux m'authentifier et me voir attribuer un rôle RBAC, afin que les surfaces et actions gated par rôle fonctionnent."

**2. Aucune story de setup initial de projet / environnement (greenfield).**
Le système est un greenfield 3-tiers (Client Python, Backend FastAPI, PostgreSQL, IHM Next.js/React) sans template de démarrage identifié dans l'architecture. Les indicateurs attendus pour un projet greenfield (story de setup initial, configuration d'environnement de dev, pipeline CI/CD amorcé tôt) sont **tous absents** des 21 stories.
**Recommandation :** ajouter une story d'amorçage explicite avant Epic 1 (scaffolding des 3 tiers, config DB/migrations initiale, pipeline CI/CD minimal) pour éviter que cette charge de travail réelle reste invisible dans le sprint planning.

### 🟠 Major Issues

**3. Story 1.1 formulée "As a System" plutôt qu'un rôle humain.**
"As a System, I want to index all BMAD artifacts... So that they can be tracked, analyzed, and their health monitored." C'est une story d'infrastructure travestie en story utilisateur. Elle reste acceptable en tant que story "enabler" au sein d'un epic à valeur utilisateur (Epic 1), mais devrait soit être explicitement labellisée comme technique/enabler, soit reformulée autour du PM/Analyste qui bénéficie effectivement d'un index peuplé.

**4. Rigueur des Acceptance Criteria inégale entre epics.**
Epics 3, 5 et 6 couvrent systématiquement les cas d'échec (heartbeat périmé >30s, échec partiel de re-sync sans bloquer les autres, référence cassée → score partiel, déconnexion Backend → toast "Reconnecting…"). En revanche, **Epic 1 (1.1–1.3), Epic 2 / Story 2.1, et Epic 4 (4.1–4.3) restent essentiellement happy-path** : aucun cas d'artifact malformé ou de lien cassé dans Epic 1, aucun scénario de reconnexion/erreur explicite dans Story 2.1, aucun cas "données sprint indisponibles" dans Epic 4.
**Recommandation :** avant passage en dev, uniformiser le niveau de rigueur des AC — répliquer sur Epic 1/2/4 le même standard de gestion d'erreur déjà appliqué avec succès sur Epic 3/5/6.

**5. Surface UX "Synchronization Center" sans story dédiée** (reporté depuis l'étape UX Alignment) — risque de doublon ou d'oubli d'écran à l'implémentation ; à trancher avant Phase 4.

### 🟡 Minor Concerns

**6. Story 2.1 fusionne FR5 et FR6** (pilier WebSocket + Backend comme pont/arbitre du remote) en un seul bloc d'AC. Cohérent fonctionnellement, mais à confirmer que ce n'est pas en réalité deux efforts d'implémentation distincts compressés dans une seule story.

**7. FR14 / FR18 / FR20** (reporté depuis PRD Analysis / Epic Coverage) : stories bien conçues mais construites sur des éléments (modèle à deux axes, cérémonies, seuils de risque chiffrés) sans ancrage explicite dans le texte du PRD — à rétro-documenter, pas un défaut de qualité de story en soi.

### Best Practices Compliance — par Epic

| Epic | Valeur utilisateur | Indépendance | Stories bien dimensionnées | Pas de forward dep | AC claires | Traçabilité FR |
| --- | --- | --- | --- | --- | --- | --- |
| Epic 1 | ✓ (avec réserve sur 1.1) | ✓ | ✓ | ✓ | 🟠 happy-path seulement | ✓ |
| Epic 2 | ✓ | ✓ | ✓ | ✓ | 🟠 2.1 léger sur erreurs | ✓ |
| Epic 3 | ✓ | ✓ (consomme Epic 2) | ✓ | ✓ | ✓ excellent | ✓ |
| Epic 4 | ✓ | ✓ | ✓ | ✓ | 🟠 happy-path seulement | ✓ |
| Epic 5 | ✓ | ✓ (consomme Epic 2) | ✓ | ✓ | ✓ excellent | ✓ |
| Epic 6 | ✓ | ⚠️ suppose un RBAC jamais construit | ✓ | ✓ | ✓ excellent | ✓ |

---

## Summary and Recommendations

### Overall Readiness Status

**NEEDS WORK** — le socle (PRD, Architecture, UX, Epics) est solide et exceptionnellement bien tracé pour un projet de cette taille, mais **2 lacunes critiques bloquent un démarrage propre de la Phase 4** et doivent être comblées avant le premier sprint.

### Critical Issues Requiring Immediate Action

1. **Aucune story d'authentification / RBAC.** Tous les rôles (Dev, PM, Architecte, Admin) et toutes les surfaces gated par rôle (Epic 6 en particulier) supposent un système d'identité déjà fonctionnel, mais aucune des 21 stories ne le construit. Sans elle, Story 6.1/6.2 et toute logique "Given I am authenticated as X" n'ont pas de fondation à implémenter.
2. **Aucune story de setup initial de projet (greenfield).** Système 3-tiers (Client Python, Backend FastAPI, PostgreSQL, IHM Next.js) sans story de scaffolding, configuration d'environnement, ou pipeline CI/CD. Ce travail réel resterait invisible du sprint planning s'il n'est pas explicité.

### Issues secondaires (non bloquantes mais à traiter avant ou pendant le premier sprint)

- **Surface "Synchronization Center"** définie dans EXPERIENCE.md sans story ni ligne d'architecture dédiée — à trancher (story propre, ou fusion documentée avec Dashboard Overview/Health).
- **FR14, FR18, FR20** (modèle presence/sync-state, cérémonies, seuils de risque 3j/48h et "modules à risque de conflit Git") introduits dans `epics.md`/l'architecture sans ancrage dans le texte du PRD — à rétro-documenter dans le PRD pour qu'il reste source de vérité.
- **NFR6 (latence de sync)** non quantifié, contrairement au reste du PRD qui chiffre systématiquement ses seuils.
- **NFR8/NFR9 (accessibilité WCAG AA, clavier)** portés uniquement par l'UX, absents du PRD — risque de perte si l'UX évolue sans garde-fou PRD.
- **Citation PRD inexacte** dans EXPERIENCE.md Flow 2 (le seuil "3 jours" attribué au §3.3, qui ne le contient pas).
- **Story 1.1 "As a System"** — story d'infra travestie en story utilisateur ; à relabelliser explicitement comme enabler technique.
- **Rigueur des AC inégale** : Epic 1/2/4 restent happy-path alors qu'Epic 3/5/6 couvrent systématiquement les cas d'échec — à uniformiser avant dev.
- **Housekeeping documentaire** : archiver/renommer `prds/prd-tarmacacademy-2026-07-30/` et `ux-designs/ux-tarmacacademy-2026-07-31/`, désormais supersédés, pour éviter toute confusion future.

### Recommended Next Steps

1. Écrire et insérer une story fondatrice Auth/RBAC (probablement en tête d'Epic 2, ou nouvel "Epic 0") avant tout découpage de sprint.
2. Écrire et insérer une story de setup initial de projet (scaffolding 3-tiers + CI/CD minimal) en tête d'Epic 1.
3. Trancher le sort de "Synchronization Center" (story dédiée vs fusion avec Story 3.3) et mettre à jour `epics.md` + EXPERIENCE.md en conséquence.
4. Rétro-documenter dans le PRD (ou son changelog) les décisions FR14/FR18/FR20 et quantifier NFR6 ; corriger la citation §3.3 dans EXPERIENCE.md.
5. Relever le niveau des AC d'Epic 1/2/4 au standard déjà atteint par Epic 3/5/6 (cas d'erreur explicites).
6. Archiver les versions PRD/UX supersédées pour assainir `planning-artifacts/`.

### Final Note

Cette évaluation a identifié **16 constats** répartis en 2 critiques, 7 majeurs et 7 mineurs, sur 5 catégories (inventaire documentaire, PRD, couverture epics, alignement UX, qualité des epics). La couverture fonctionnelle est excellente (100% des FR tracés vers une story), et la traçabilité inter-documents (PRD ↔ Architecture ↔ UX ↔ Epics) est d'un niveau rare. Les deux points critiques (Auth/RBAC, setup initial) doivent être comblés avant le premier sprint d'implémentation ; le reste peut être traité en parallèle du démarrage sans bloquer Phase 4.
