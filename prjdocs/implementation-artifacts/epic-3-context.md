# Epic 3 Context: Claims, Contributors & Team Sync View

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Les membres de l'équipe voient en temps réel qui est synchronisé ou en conflit, réservent des User Stories via un mécanisme de lease sans risque de double-claim, et consultent le détail d'un contributeur.

## Stories

- Story 3.1: Lease-based Story Claiming
- Story 3.2: Auto-Healing Sync on Claim Conflict
- Story 3.3: Dashboard Overview/Health
- Story 3.4: Contributor Views with Status Indicators
- Story 3.5: Contributor Detail Panel
- Story 3.6: One-click Re-sync
- Story 3.7: Real-time Notifications

## Requirements & Constraints

- FR11: Le Backend émet des leases à durée limitée pour réserver les User Stories ; le Client maintient un heartbeat WebSocket ; si le heartbeat cesse pendant plus de 60s, le Backend expire automatiquement le lease et libère le claim.
- FR12: Quand un claim est rejeté ou un conflit détecté, le Client est automatiquement signalé pour se resynchroniser avec le Backend/Remote Repo (Auto-Healing Sync).
- FR13: Afficher une vue générale Git + BMAD (Dashboard Overview/Health : état global du repo, branches, PRs, sync status, Local vs Remote).
- FR14: Afficher des vues par contributeur avec indicateurs de statut portés par deux signaux indépendants — presence (connecté/absent) et sync-state (Synchronisé/Drift/Conflit/Syncing-Actif/Claimé) — jamais fusionnés en storage ni en payload ; les surfaces multi-axes (Dashboard, Contributor Detail) rendent les deux indépendamment, et le Status Pill les collapse en une palette à 6 valeurs (Synchronisé/Drift/Conflit/Syncing-Actif/Claimé/Idle-Offline) selon la règle fixe : absent → toujours `Idle-Offline`, sinon la valeur du sync-state.
- FR15: Fournir un panneau Détail Contributeur (Fiche Contributeur) accessible depuis tout Status Pill/ligne nommant un contributeur : Identity Header, statut d'accès, état du dépôt en temps réel, projets liés, activité récente.
- FR16: Fournir une action `[Re-sync]` en un clic pour resynchroniser une ou plusieurs stories stale/en conflit.
- FR23: Fournir des notifications instantanées non intrusives (WebSocket toasts) pour les mises à jour temps réel.
- NFR1: Toutes les opérations de sync, claim, et vérification d'état sont 100% déterministes (scripts CLI, parsing fichiers, commandes Git). Zéro appel LLM pour les tâches de sync, claim, ou vérification d'état.
- NFR5: Toutes les transitions d'état critiques (claims, expirations de lease, événements de sync) sont journalisées dans `.memlog.md` pour garantir un historique lisible et vérifiable.
- NFR6: Latence de sync minimale entre un événement Git et sa représentation visuelle dans le Dashboard.
- NFR7: Taux de collision zéro — aucun double-claim ni conflit d'état en environnement multi-utilisateur.
- NFR8: Contraste visuel élevé (WCAG AA) pour tous les indicateurs de statut opérationnels, sur `{colors.background}` et `{colors.surface}`.

## Technical Decisions

- AD-002 (Lease-based Heartbeat) [ADOPTED] : claim = lease à durée limitée, expiration auto si heartbeat WebSocket > 60s.
- AD-008 (Local Repo State Reporting — one stream, one canonical read model) [ADOPTED] : le Client pousse un flux unique de drift/actions Git (hook immédiat + tick de sécurité 10s configurable, piggyback sur le heartbeat AD-002) ; le Backend maintient un seul enregistrement canonique versionné par contributeur — chaque consommateur (statut contributeur, Risk & Quality Signals FR20, Status Pill) lit ce même enregistrement, jamais une projection indépendante. Seuil de staleness 30s partagé par toutes les surfaces ("Last known — {time}" au-delà).
- AD-009 (Statut contributeur — deux signaux orthogonaux) [ADOPTED] : presence (`connecté`/`absent`) et sync-state (`synchronisé`/`drift`/`conflit`/`syncing-actif`/`claimé`) sont deux champs indépendamment modifiables en storage et en payload — jamais un enum fusionné, pour éviter qu'une mise à jour concurrente de l'un écrase l'autre. Les surfaces multi-axes (Dashboard, Contributor Detail) rendent les deux axes indépendamment. Le Status Pill (FR14/UX-DR5) est la seule règle de collapse sanctionnée : `absent` → toujours `Idle-Offline` quel que soit le sync-state, sinon la valeur du sync-state.
- Communication via WebSockets (Real-time Bidirectional) pour le heartbeat et les événements temps réel.

## UX & Interaction Patterns

- UX-DR2: Palette de statut opérationnel à 6 couleurs, une seule signification par couleur, jamais réutilisée ailleurs dans l'UI (Success/Warning/Error/Info/Action/Neutral).
- UX-DR3: Distinction visuelle Local (muted — neutral/text-secondary) vs Remote (vibrant — info/action avec glow) context.
- UX-DR5: Composant Status Pill — pastille + label ; clic navigue toujours vers le détail de l'entité (jamais purement décoratif).
- UX-DR6: Composant Identity Header — avatar (initiales sur tuile gradient `{colors.action}`) + nom + rôle.
- UX-DR7: Composant Alert Banner — bloc teinté/bordé, affiché uniquement si condition bloquante existe (pas de variant "tout va bien").
- UX-DR8: Composant Data-heavy Tables — lignes haute densité, actions inline, cellules de statut colorées ; même règles pour paires label/valeur en panneau non-tabulaire.
- UX-DR9: Composant Activity/Event Feed — flux vertical chronologique (plus récent en premier), plafonné à 20 entrées visibles + "Charger plus".
- UX-DR10: Composant Real-time Status Bar — indicateur de connectivité WebSocket pleine largeur, `{colors.info}` actif / `{colors.neutral}` idle.
- UX-DR11: Composant Contributor Detail Panel — composition Identity Header + Status Pill + Alert Banner (conditionnel) + Data-heavy Tables (accès & état repo) + Activity Feed.
- UX-DR15: Accessibilité — focus ring visible `{colors.info}` en contraste AA sur chaque élément interactif ; navigation clavier complète, ordre de tabulation = ordre de lecture visuel.

## Cross-Story Dependencies

- Story 3.1 (Lease-based claiming) et Story 3.2 (Auto-Healing Sync) dépendent du pilier WebSocket établi en Epic 2.
- Story 3.3 (Dashboard Overview/Health) fournit la vue globale Git + BMAD et sert de base pour Story 3.4 (Contributor Views).
- Story 3.4 (Contributor Views with Status Indicators) introduit le composant Status Pill avec les deux signaux orthogonaux (presence et sync-state), utilisé par Story 3.5 (Contributor Detail Panel).
- Story 3.5 (Contributor Detail Panel) s'appuie sur les composants de Story 3.4 (Identity Header, Status Pill, Alert Banner, Data-heavy Tables, Activity Feed).
- Story 3.6 (One-click Re-sync) s'appuie sur les stories de claim (3.1) et de détection de conflit (3.2) pour identifier les stories stale/en conflit.
- Story 3.7 (Real-time Notifications) utilise le pilier WebSocket pour émettre des toasts non intrusifs sur les événements de claim, sync, et conflit.
