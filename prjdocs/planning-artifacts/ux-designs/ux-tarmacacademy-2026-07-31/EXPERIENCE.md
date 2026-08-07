---
title: "BMAD Portal MVP - Artifact & Team Sync Hub"
status: final
created: 2026-07-31
updated: 2026-07-31
---

# BMAD Portal MVP - Experience Specification

## Foundation

**Form-factor:** Multi-surface (Web desktop prioritary, responsive mobile)  
**UI System:** MUI (Material Design) - Customisé pour style Commercial SaaS  
**Visual Identity Reference:** `DESIGN.md` (thème Vibrant Innovation, espacements généreux, composants MUI customisés)

Ce portail sert plusieurs rôles utilisateurs avec des besoins spécifiques :
- **Développeurs (Dev)** : Vue tâches US, statut sync local/remote, gestion claims, branches, PRs
- **Product Managers (PM) / Product Owners** : Vue Roadmap, Sprint Status, Artifact Health, Risk Signals
- **Analystes** : Vue artifacts PRD, Brief, Specs, liens avec stories et besoins métier, traçabilité
- **Tech Leads / Architects** : Vue Compliance & Quality Gates, Traceability Matrix, Dependency Map
- **QA / Reviewers** : Vue Tests, PRs to review, Spec vs Implementation compliance

## Information Architecture

### Main Navigation Surfaces

| Surface | Route Conceptuelle | Rôle Principal | Objectif Climax |
|---------|-------------------|----------------|-----------------|
| Dashboard Principal | `/` ou `/dashboard` | Tous rôles | Vue globale en 2 minutes : santé artifacts, progression sprint, signaux risque |
| Artifacts Catalog | `/artifacts` | Analystes, PM | Trouver et vérifier la complétude d'un artifact spécifique |
| Team Sync View | `/team-sync` | Devs, Tech Leads | Vérifier sync local/remote, gérer claims, voir état contributeurs |
| Sprint Dashboard | `/sprints` | PM, Devs | Suivre progression sprint, cérémonies, métriques déterministes |
| Risk & Quality | `/risks` | Tech Leads, QA | Identifier et résoudre signaux de risque, quality gates |

### Component Hierarchy

- **Layout Shell:** Header global (logo, nav, user menu) + Main Content Area
- **Dashboard Grid:** Stats Row (4 KPIs) + Main Content (2-column: artifacts/sprints | risks/contributors)
- **Card System:** Reusable container for artifacts, lists, metrics, signals
- **Status Indicators:** Consistent pill-shaped badges across all surfaces

## Voice and Tone

**Microcopy Style:** Direct, technique mais accessible, déterministe.  
**Ton:** Professionnel, factuel, orienté action. Pas de fluff ou de langage marketing.

**Exemples de microcopy:**
- Status: "Connected / Live sync" vs "Absent / Cached state"
- Actions: "Vérifier & Re-Claim", "Nouvelle Sync", "Voir Stories Disponibles"
- Signals: "Story stale > 3 jours", "PR en attente de review > 48h", "Module à haut risque de conflit"
- Quality Gates: "Pass", "Pending", "Fail" avec indicateurs visuels (✓, ◐, ✗)

## Component Patterns

### Status Indicators
- **Format:** Dot + Text label
- **Shapes:** Pill badge (16px border-radius)
- **Colors:** Sémantiques (green for connected/success, orange for cached/warning, red for error/risk)
- **Usage:** Sync status, contributor status, artifact completeness, ceremony status

### Claim Mechanism
- **Pattern:** Deterministic claim with `bmad claim <us-id> --remote-check`
- **UI Representation:** Button on contributor card or story item
- **States:** Active claim (disabled button showing current US), Available claim (clickable button), Expired claim (warning state with re-claim action)
- **Remote Check:** Visual indicator showing sync status between local and remote

### Risk Signals
- **Format:** Horizontal card with left border accent (color-coded by severity)
- **Severity Levels:** Error (critical), Warning (medium), Info (low)
- **Content:** Title + Description + Timestamp
- **Actions:** Optional dismiss or investigate action per signal

### Quality Gates
- **Format:** List items with status badges
- **Statuses:** Pass (green ✓), Pending (orange ◐), Fail (red ✗)
- **Gates Examples:** "Specs présentes pour US", "PRs reviewed avant merge", "Tests liés aux stories"

## State Patterns

### Contributor States
| State | Visual Indicator | Meaning |
|-------|-----------------|---------|
| Connected/Live | Green dot + "Connecté" | Status chargé depuis repo local ou Git live |
| Cached | Orange dot + "Cache" | Status chargé depuis dernière image/sync connue |

### Sync States
| State | Visual Indicator | Meaning |
|-------|-----------------|---------|
| Sync Complete | Green check + "Sync" | Local et remote alignés |
| Delta Detected | Warning icon + "Delta" | Différence entre local et remote détectée |
| Sync Pending | Loading indicator | Sync en cours |

### Artifact Health States
| State | Badge | Color |
|-------|-------|-------|
| Complet | "Complet" + dot | Green (#00c853) |
| En cours | "En cours" + dot | Orange (#ffab00) |
| Incomplet | "Incomplet" + dot | Red (#b00020) |

## Interaction Primitives

### Deterministic Actions (No LLM)
- **Sync Check:** `bmad sync` → produces JSON/Markdown reports
- **Claim Action:** `bmad claim <us-id> --remote-check` → verifies remote state, prevents double-claims
- **Sprint Status:** `bmad sprint status` → produces burn-down, velocity charts from artifacts and Git activity

### UI Interactions
- **Refresh Actions:** Button-triggered sync refresh with loading state
- **Claim Workflow:** Click → remote check → confirm → update UI to active state
- **Risk Dismissal:** Optional action to acknowledge and dismiss non-critical signals

## Accessibility Floor

- **Color Contrast:** All text and interactive elements meet WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- **Status Indicators:** Not color-only; dot shape + text label + color for redundancy
- **Keyboard Navigation:** All interactive elements (buttons, links, cards) focusable with visible focus state
- **Screen Reader:** Semantic HTML, ARIA labels for status indicators and progress bars

## Key Flows

### Flow 1: Dashboard Entry (All Roles)
**Protagonist:** Marie, chef de projet technique, veut vérifier en 2 minutes l'état de son projet.

**Steps:**
1. Marie se connecte au portail BMAD
2. Vue immédiate du Stats Row : 24 artifacts, 8 contributeurs, 12 stories sprint, 3 signaux de risque
3. Regard sur la carte "Santé des Artifacts" : 85% complet, liste avec statuts par artifact
4. Regard sur la carte "Progression du Sprint" : 8/12 stories complétées (67%), barre de progression visuelle
5. Regard sur la colonne "Signaux de Risque" : identifie 1 story stale > 3j, 1 PR en attente > 48h
6. **Climax beat :** Marie a une vue complète en < 2 minutes, peut cliquer sur un signal pour investiguer ou passer à une vue détaillée

### Flow 2: Team Sync & Claim (Developer)
**Protagonist:** Jean, développeur frontend, veut vérifier son statut de sync et faire un claim sur une story disponible.

**Steps:**
1. Jean navigue vers la vue "Team Sync"
2. Vue de sa carte contributeur : statut "Connecté", sync "Local vs Remote: Sync"
3. Voir sa tâche assignée : "US-2024-045: Artifact Health Dashboard"
4. Vérifier les détails de sync : dernier commit, PR associée, status claim actif
5. Pour une nouvelle task, Jean clique sur "Voir Stories Disponibles" (sur carte d'un contributeur disponible ou via liste)
6. Sélectionne une story disponible, clique sur "Vérifier & Re-Claim" ou bouton claim équivalent
7. **Climax beat :** Le mécanisme déterministe vérifie l'état remote et confirme le claim sans double-claim possible

### Flow 3: Sprint & Risk Review (PM / Tech Lead)
**Protagonist:** Sophie, tech lead, veut vérifier la progression sprint et résoudre les signaux de risque.

**Steps:**
1. Sophie navigue vers le "Sprint & Risk Dashboard"
2. Vue des métadonnées du sprint actuel : dates, objectif, progression 8/12 (67%)
3. Vérification de la barre de progression visuelle
4. Consultation de la liste des cérémonies : Planning (terminée), Standup (terminée), Review (à venir), Retro (à venir)
5. Regard sur les "Métriques de risque" : 1 story stale > 3j, 2 PRs > 48h, 85% quality gates
6. Inspection des signaux détaillés : story US-2024-042 sans activité depuis le 27 juil., PR #142 en attente de review
7. Vérification des Quality Gates : Specs présentes (Pass), PRs reviewed (Pending), Tests liés (Fail)
8. **Climax beat :** Sophie identifie les actions correctives : relancer l'équipe pour les tests liés, review la PR #142, mettre à jour le statut de US-2024-042

## Mock Coverage Notes

Les maquettes HTML produites couvrent les surfaces IA suivantes :
- **Dashboard Principal** : `.working/key-dashboard-main.html`
- **Team Sync & Contributors View** : `.working/key-team-sync.html`
- **Sprint & Ceremony Dashboard + Risk Signals** : `.working/key-sprint-risk.html`

Toutes les autres surfaces peuvent être dérivées de ces patterns composants et states documentés ici. Les spines `DESIGN.md` et `EXPERIENCE.md` gagnent en cas de conflit avec toute maquette ou wireframe.
