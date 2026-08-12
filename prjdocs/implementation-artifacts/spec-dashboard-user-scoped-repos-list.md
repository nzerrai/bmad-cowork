---
title: 'Dashboard : repos rattachés à l''utilisateur (admin = tous)'
type: 'feature'
created: '2026-08-12'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '06f8056771c88dbecb935579496058f75476dcba'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/hub/dashboard` affiche un seul repo avec des données de branche/PR entièrement mockées (`MOCK_BRANCH`/`MOCK_PRS`), sans aucun lien avec les repos réels auxquels l'utilisateur connecté est rattaché.

**Approach:** Introduire un modèle d'appartenance utilisateur↔repo (`SpaceMembership`), l'alimenter automatiquement quand le Client d'un utilisateur rapporte son identité pour un repo, exposer un nouvel endpoint scopé par rôle (admin = tous les `Space`, sinon = uniquement les `Space` rattachés à l'utilisateur), et remplacer le contenu mocké de `/hub/dashboard` par cette liste réelle — qui reste la première chose affichée sur cette page.

## Boundaries & Constraints

**Always:**
- `GET /hub/dashboard/repos` retourne tous les `Space` si `user.role == Role.ADMIN`, sinon uniquement les `Space` où une `SpaceMembership(user_id, space_id)` existe.
- La `SpaceMembership` est créée automatiquement dans `_process_client_identity` (le point où un Client rapporte déjà son identité et fait `get_or_create_space`) — jamais via une action manuelle dans ce périmètre.
- Pour chaque repo retourné, si l'utilisateur courant a un `ContributorGitState` dont `technical_identifier` correspond, inclure branche/ahead/behind/statut sync ; sinon ne pas fabriquer de données (état "Pas d'état Git local rapporté").
- Les PR restent vides/absentes par repo — pas d'intégration PR backend existante, cohérent avec la convention déjà en place (`claims`/`riskSignals` vides plutôt que fabriqués dans `get_dashboard_data`).
- `/hub/dashboard` conserve le Real-Time Status Bar, l'état "Hub injoignable" (timestamp figé), et le message "No repositories connected yet" + lien onboarding déjà spécifiés par Story 3.3 — désormais piloté par la liste réelle (vide ou non).

**Ask First:** Aucune — source de la membership, contenu par repo, et remplacement du contenu existant ont déjà été validés avec l'humain.

**Never:**
- Ne pas construire d'UI d'administration de la membership (ajout/retrait manuel) dans ce périmètre.
- Ne pas fabriquer de données PR.
- Ne pas modifier `/hub/admin/repos` (reste l'endpoint admin existant, inchangé).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| ADMIN_SEES_ALL | Admin authentifié appelle l'endpoint | Retourne tous les `Space` connus | N/A |
| USER_SEES_OWN | Développeur avec 1+ `SpaceMembership` | Retourne uniquement ses repos, avec branche/sync si `ContributorGitState` correspond | N/A |
| NO_REPOS_CONNECTED | Développeur sans membership | Dashboard affiche "No repositories connected yet" + lien onboarding | N/A |
| MEMBERSHIP_ON_IDENTITY | Client rapporte `client_identity_report` pour un repo | `SpaceMembership(user_id, space_id)` créée si absente (idempotent si déjà présente) | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/hub/models.py` -- ajouter `SpaceMembership` (user_id UUID FK users, space_id UUID FK spaces, unique ensemble)
- `backend/alembic/versions/` (nouvelle) -- migration `space_memberships`, chaînée sur `0a2ae1447e3a`
- `backend/app/hub/service.py` -- `get_or_create_membership(db, user_id, space_id)`
- `backend/app/realtime/router.py` -- `_process_client_identity` appelle `get_or_create_membership` après `get_or_create_space`
- `backend/app/hub/router.py` -- `GET /hub/dashboard/repos`, scopé par rôle, réutilise `_space_to_repo_out` + jointure `ContributorGitState`
- `ihm/app/hub/dashboard/page.tsx` -- fetch `GET /hub/dashboard/repos` via `authFetch`, retire `MOCK_BRANCH`/`MOCK_PRS`
- `ihm/app/components/dashboard/OverviewDashboard.tsx` -- accepte une liste de repos au lieu d'un seul `initialBranch`
- `backend/tests/test_hub_dashboard_repos_router.py` (nouveau) -- couvre la matrice I/O
- `backend/tests/test_realtime.py` -- étend pour couvrir MEMBERSHIP_ON_IDENTITY

## Tasks & Acceptance

**Execution:**
- [x] `backend/app/hub/models.py` -- ajouter `SpaceMembership` -- table d'appartenance user↔repo
- [x] `backend/alembic/versions/4d79dbe7a755_add_space_memberships.py` -- migration -- crée la table, FK + contrainte unique `(user_id, space_id)`
- [x] `backend/app/hub/service.py` -- `get_or_create_membership` -- idempotent, appelé à la jonction
- [x] `backend/app/realtime/router.py` -- brancher `get_or_create_membership` dans `_process_client_identity` -- établit la membership à la connexion
- [x] `backend/app/hub/router.py` -- `GET /hub/dashboard/repos` -- liste scopée par rôle + détail branche/sync par repo
- [x] `ihm/app/hub/dashboard/page.tsx` + `OverviewDashboard.tsx` -- consomment le nouvel endpoint, suppriment les mocks
- [x] `backend/tests/test_hub_dashboard_repos_router.py` -- teste les 4 scénarios de la matrice I/O
- [x] `backend/tests/test_realtime.py` -- teste la création de membership à l'identity report, + régression P1 (pas de membership si accès refusé)
- [x] `backend/tests/test_hub_service.py` -- régression P2 : `get_or_create_membership` résout la course sur le fallback d'insertion sans lever d'`IntegrityError`

**Acceptance Criteria:**
- Given un admin authentifié, when il ouvre `/hub/dashboard`, then il voit tous les repos connus de la plateforme
- Given un développeur dont le Client a déjà rapporté son identité pour un repo, when il ouvre `/hub/dashboard`, then il voit ce repo (et uniquement ceux-là) avec sa branche/statut sync si disponible
- Given un développeur sans repo rattaché, when il ouvre `/hub/dashboard`, then il voit "No repositories connected yet" avec un lien vers l'onboarding
- Given le Hub devient injoignable après un premier chargement réussi, when la connexion WebSocket tombe, then la barre passe à l'état "unreachable" et les données restent visibles avec un timestamp figé

## Spec Change Log

- Implémentation (2026-08-12): migration `4d79dbe7a755_add_space_memberships.py` chaînée sur `0a2ae1447e3a`. `ihm/__tests__/dashboard-overview.test.tsx` a été réécrit intégralement (il ne contenait auparavant que des assertions sur des objets mock, sans jamais monter le composant réel) pour rendre vraiment `HubDashboardPage`/`OverviewDashboard` via `@testing-library/react`, dans le même style que `login.test.tsx`. `BranchPRStatus.tsx` n'a pas eu besoin d'être modifié -- réutilisé tel quel par repo dans `OverviewDashboard`.
- Note (hors périmètre, non corrigée): `OverviewDashboard`'s WebSocket reconnect effect (`useEffect([hubStatus, wsConnectionStatus])`) rappelle `conn.connect()` à chaque changement de `wsConnectionStatus`, y compris vers `"open"` -- un comportement préexistant (identique avant cette révision) qui fait boucler la reconnexion sans jamais se stabiliser sur "Live" dans un test isolé. Le nouveau test frontend vérifie donc la construction réelle du WebSocket et l'état "Idle" initial plutôt que la transition vers "Live", pour rester honnête sur le comportement réel sans étendre le périmètre de cette spec à un correctif de `lib/websocket.ts`/`OverviewDashboard`'s effect wiring.
- Note (préexistant, non touché): `backend/tests/test_migrations.py::test_migrations_create_only_the_expected_tables` échouait déjà avant cette révision (sa liste de tables attendues est restée figée sur une story antérieure et ne couvre déjà pas `spaces`/`contributor_git_states`) -- hors périmètre, non modifié. `test_artifact_health.py::test_get_with_configured_origin_returns_allow_origin_header` et deux tests de `test_auth.py` (whitespace normalization, invalid-algorithm via une API PyJWT renommée) échouent aussi indépendamment de ce travail.
- Revue (2026-08-12, review layers blind-hunter + edge-case-hunter -- verification-gap n'a trouvé aucun écart) : 5 correctifs appliqués, tous conformes au spec (pas de renégociation nécessaire).
  - **P1 (autorisation, `realtime/router.py` `_process_client_identity`)** : `get_or_create_membership` était appelé inconditionnellement juste après `get_or_create_space`, avant même la vérification d'accès -- un utilisateur authentifié pouvait donc rapporter le `technical_identifier` de n'importe quel repo existant (même sans y avoir réellement accès) et obtenir une `SpaceMembership` permanente, exposant ce repo sur son propre `GET /hub/dashboard/repos`. Corrigé en déplaçant l'appel sous `if has_access:`, au même niveau que le passage `PENDING -> ACTIVE` déjà conditionné sur ce même `has_access` -- la membership reste automatique (aucune action manuelle), simplement conditionnée sur un accès réel, cohérent avec l'`Always` du spec. Régression couverte par `test_client_identity_report_no_membership_when_access_denied` dans `test_realtime.py`.
  - **P2 (robustesse, `hub/service.py` `get_or_create_membership`)** : le chemin de repli après l'upsert (`db.add`/`db.commit` quand la re-sélection post-`ON CONFLICT DO NOTHING` ne trouve rien) n'était pas protégé contre une véritable course, où il aurait levé une `IntegrityError` non interceptée -- qui aurait remonté jusqu'au handler WebSocket (seul un `except WebSocketDisconnect` existe à ce niveau). Corrigé avec `try/except IntegrityError: db.rollback(); <re-sélection>`, même idiome que les autres upserts de ce module. Régression couverte par `TestGetOrCreateMembership.test_race_on_fallback_insert_resolves_to_the_concurrently_created_row` dans `test_hub_service.py`.
  - **P3 (fabrication implicite, `OverviewDashboard.tsx` `toBranchInfo`)** : `git_state.is_stale`/`status_message` étaient récupérés mais jamais utilisés -- un état Git périmé s'affichait identiquement à un état frais, ce qui est une forme de fabrication silencieuse (contraire à l'`Always` "ne pas fabriquer de données"). Corrigé : quand `is_stale` est vrai, le nom de branche affiché intègre `status_message` (ex. `"main (Last known — 45s ago)"`). Couvert par deux nouveaux tests (`a stale git_state surfaces the staleness...` / `a fresh (non-stale) git_state renders the plain branch name...`).
  - **P4 (closure obsolète, `OverviewDashboard.tsx`)** : la callback `onStatusChange` de `RealtimeConnection`, construite une seule fois (`if (!realtimeConnRef.current)`), fermait sur `repos` au moment de sa création -- comme `repos` arrive désormais de façon asynchrone (fetch dans le parent, ce n'était plus le mock statique d'avant), la callback continuait de lire une valeur figée (souvent `[]`) même après le chargement réel des repos, empêchant `lastKnownStateTimestamp` de se figer correctement à une déconnexion tardive. Corrigé avec un `reposRef` mis à jour à chaque rendu, lu depuis la callback au lieu de fermer directement sur la prop.
  - **P5 (chargement/erreur non distingués, `ihm/app/hub/dashboard/page.tsx`)** : `repos` démarrait à `[]` et un échec de fetch (401 compris) était avalé silencieusement en `catch(() => {})`, rendant indiscernables "en cours de chargement", "vraiment vide", et "la requête a échoué" -- les trois affichaient le même message d'onboarding, y compris pour un utilisateur avec de nombreux repos (flash visible) ou une session expirée. Corrigé en suivant le pattern chargement/erreur/données à trois branches déjà utilisé par `ihm/app/hub/spaces/page.tsx` dans ce même repo : état `loading` (affiché avant toute résolution), état `error` distinct (message dédié pour 401 vs erreur générique), et `Array.isArray(data.repos) ? data.repos : []` pour ne jamais planter sur une réponse malformée. Le test `"a failed fetch leaves the repo list empty..."` (qui asserait l'ancien comportement, désormais incorrect) a été remplacé par quatre tests : chargement, échec générique, 401, réponse malformée.

## Design Notes

`GET /hub/dashboard/repos` réutilise `_space_to_repo_out` (déjà utilisé par `/hub/admin/repos`) pour la forme de base de chaque repo, puis enrichit chaque entrée avec un sous-objet `git_state` optionnel (issu de `ContributorGitState` de l'utilisateur courant, filtré par `technical_identifier`) plutôt que de dupliquer la sérialisation.

Côté IHM, `OverviewDashboard` remplace `initialBranch`/`initialPRs` par `initialRepos: DashboardRepo[]` (miroir de la réponse `{ repos: [...] }`) et affiche un bloc par repo : `BranchPRStatus` (branche/ahead/behind dérivés de `git_state`) quand `git_state` est présent, sinon le texte "No local Git state reported" -- jamais de donnée fabriquée. `hasNoRepositories` est désormais `repos.length === 0`, ce qui pilote directement le message "No repositories connected yet" + lien onboarding. `page.tsx` fait le fetch (`authFetch("/hub/dashboard/repos")`) dans un `useEffect` et passe la liste telle quelle à `OverviewDashboard` (pas d'état interne dupliqué dans le composant -- il consomme directement la prop, qui se met à jour au re-render du parent une fois le fetch résolu).

## Verification

**Commands:**
- `cd backend && uv run pytest tests/test_hub_dashboard_repos_router.py tests/test_realtime.py -q` -- expected: SUCCESS
- `cd backend && uv run alembic upgrade head` -- expected: migration appliquée sans erreur
- `cd ihm && npm test -- __tests__/dashboard-overview.test.tsx` -- expected: SUCCESS

**Manual checks (if no CLI):**
- Se connecter en tant qu'admin → voir tous les repos sur `/hub/dashboard`
- Se connecter en tant que développeur sans repo rattaché → voir "No repositories connected yet"

## Suggested Review Order

**Appartenance : qui obtient un accès, et quand**

- Point d'entrée : la membership n'est créée que si l'accès au repo est réellement vérifié, jamais sur la seule foi du `technical_identifier` rapporté.
  [`router.py:104`](../../backend/app/realtime/router.py#L104)

- Modèle de la relation user↔repo : FKs UUID réelles vers `users`/`spaces`, contrainte unique `(user_id, space_id)`.
  [`models.py:60`](../../backend/app/hub/models.py#L60)

- Upsert idempotent avec repli protégé contre une course concurrente (`IntegrityError` interceptée plutôt que remontée jusqu'au handler WebSocket).
  [`service.py:232`](../../backend/app/hub/service.py#L232)

**Endpoint scopé par rôle**

- `GET /hub/dashboard/repos` : admin voit tous les `Space`, sinon uniquement ceux joints via `SpaceMembership`.
  [`router.py:237`](../../backend/app/hub/router.py#L237)

- Enrichissement par `git_state` (jamais fabriqué) : correspondance sur `technical_identifier`, `None` sinon.
  [`router.py:274`](../../backend/app/hub/router.py#L274)

**Rendu frontend : pas de donnée fabriquée, pas d'état ambigu**

- La liste de repos remplace les mocks `MOCK_BRANCH`/`MOCK_PRS` ; états chargement/erreur/données distincts (401 a son propre message), jamais confondus avec "vraiment vide".
  [`page.tsx:34`](../../ihm/app/hub/dashboard/page.tsx#L34)

- Un état Git périmé s'affiche différemment d'un état frais (`status_message` surfacé) au lieu de rendre la péremption invisible.
  [`OverviewDashboard.tsx:76`](../../ihm/app/components/dashboard/OverviewDashboard.tsx#L76)

- `reposRef` évite qu'un callback WebSocket créé une seule fois lise une liste de repos figée sur le premier rendu.
  [`OverviewDashboard.tsx:111`](../../ihm/app/components/dashboard/OverviewDashboard.tsx#L111)

**Périphériques**

- Migration chaînée sur `0a2ae1447e3a`, crée `space_memberships`.
  [`4d79dbe7a755_add_space_memberships.py`](../../backend/alembic/versions/4d79dbe7a755_add_space_memberships.py#L1)

- Couverture des 4 scénarios de la matrice I/O + régressions P1/P2.
  [`test_hub_dashboard_repos_router.py`](../../backend/tests/test_hub_dashboard_repos_router.py#L1)

- Régression P1 (pas de membership sans accès réel) et couverture MEMBERSHIP_ON_IDENTITY.
  [`test_realtime.py`](../../backend/tests/test_realtime.py#L1)

- Régression P2 (course sur le repli d'upsert).
  [`test_hub_service.py`](../../backend/tests/test_hub_service.py#L1)

- Rendu réel via `@testing-library/react` (chargement, erreur, 401, péremption) plutôt que de simples assertions sur des objets mock.
  [`dashboard-overview.test.tsx`](../../ihm/__tests__/dashboard-overview.test.tsx#L1)
