---
title: 'Révision Story 6.1 - Configuration Git/Repos multi-dépôts avec découverte et autorisation admin'
type: 'feature'
created: '2026-08-12'
status: 'done'
review_loop_iteration: 0
context: ['prjdocs/implementation-artifacts/epic-6-context.md', 'prjdocs/implementation-artifacts/spec-6-1-git-repos-project-configuration.md']
baseline_commit: 'db87623709a2fe5c3b2435852942688830e72260'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La configuration Git/Repos de l'admin (Story 6.1) ne gère qu'un seul dépôt, dans une table `git_repos_config` isolée du modèle `Space` déjà utilisé par la découverte automatique (Epic 2). L'admin ne voit pas les dépôts découverts via la connexion des utilisateurs, ne peut pas en ajouter plusieurs manuellement, et n'a aucun moyen d'autoriser l'accès à un dépôt privé inaccessible.

**Approach:** Unifier la configuration Git/Repos sur le modèle `Space` existant (source de vérité unique, conforme à AD-007) : la liste admin affiche tous les `Space`, qu'ils soient découverts (connexion client) ou ajoutés manuellement par l'admin. À la création ou à l'ajout d'un credential, le Backend tente réellement d'accéder au dépôt distant (`git ls-remote`) ; si l'accès échoue (dépôt privé/inaccessible), le statut reste `pending` et l'admin peut enregistrer un identifiant d'accès chiffré pour ce dépôt, ce qui redéclenche la vérification.

## Boundaries & Constraints

**Always:**
- La liste des dépôts (`Space`) reste la source de vérité unique, partagée entre la découverte (connexion client, Epic 2) et la saisie admin — jamais un second schéma d'identité pour les mêmes repos.
- Toute création de `Space` ou tout enregistrement de credential déclenche une vérification d'accès réelle et met à jour `status` en conséquence ; jamais de transition directe vers `active` sans vérification.
- Les credentials sont chiffrés au repos et jamais renvoyés en clair par l'API ; une réponse GET n'expose que `has_credential: bool`.
- RBAC admin-only sur tous les nouveaux endpoints ; skeletons de chargement et toast "Reconnecting…" sur indisponibilité Backend, cohérent avec le reste de System Administration.

**Ask First:** Aucune décision supplémentaire à arbitrer — fusion sur `Space`, autorisation par credential chiffré, et vérification réseau réelle ont déjà été validées avec l'humain.

**Never:**
- Ne pas conserver `git_repos_config` (table/modèle/service/endpoints) — supprimés, remplacés par les endpoints `Space`.
- Ne pas gérer l'authentification par clé SSH pour la vérification d'accès dans cette révision — seuls les identifiants HTTPS supportent un credential ; un identifiant SSH est vérifié sans credential (accès public ou clé déjà configurée côté Backend).
- Ne pas ajouter de suppression de dépôt dans cette révision (hors périmètre).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| ADMIN_LISTS_REPOS | Admin ouvre System Administration | Table listant tous les `Space` (identifiant, origine, statut) | N/A |
| ADMIN_ADD_MANUAL_REPO | Admin saisit une URL de dépôt et valide | `Space` créé avec `origin=manual`, vérification d'accès immédiate | URL invalide → 400 |
| DISCOVERED_REPO_LISTED | Un utilisateur se connecte depuis son poste sur un nouveau repo | Le `Space` apparaît dans la liste admin avec `origin=discovered` | N/A |
| PRIVATE_REPO_PENDING | Vérification d'accès échoue (repo privé/inaccessible) | `status=pending`, action "Autoriser l'accès" visible sur la ligne | N/A |
| ADMIN_AUTHORIZES_REPO | Admin saisit un token pour un repo `pending` | Credential chiffré stocké, accès revérifié, `status=active` si succès | Token invalide/accès toujours refusé → reste `pending`, message affiché |
| BACKEND_UNREACHABLE | Backend injoignable pendant une sauvegarde | Actions désactivées, toast "Reconnecting…" | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/hub/models.py` -- `Space` : ajouter les colonnes `origin` et `encrypted_credential`
- `backend/app/hub/service.py` -- `check_repo_access`, `get_or_create_space`, `determine_space_status` : vérification réseau réelle + prise en compte du credential
- `backend/app/hub/credentials.py` (nouveau) -- chiffrement/déchiffrement Fernet des credentials de dépôt
- `backend/app/hub/router.py` -- retirer les endpoints `git-repos-config` ; ajouter `GET/POST /hub/admin/repos`, `PATCH /hub/admin/repos/{id}/credential`
- `backend/app/hub/git_repos_config_models.py`, `backend/app/hub/git_repos_config_service.py` -- à supprimer
- `backend/alembic/versions/` (nouvelle migration) -- ajoute `origin`/`encrypted_credential` sur `spaces`, supprime `git_repos_config`
- `backend/pyproject.toml` -- ajoute la dépendance `cryptography`
- `.env.example` -- documente `REPO_CREDENTIAL_ENCRYPTION_KEY`
- `ihm/app/hub/admin/system-administration/git-repos-config/GitReposProjectConfig.tsx` -- remplacer le formulaire mono-repo par une table de dépôts + formulaire d'ajout + action d'autorisation
- `ihm/app/hub/admin/system-administration/page.tsx` -- brancher sur les nouveaux endpoints `/hub/admin/repos`
- `ihm/app/components/ui/status-pill.tsx` -- réutiliser pour le statut de chaque dépôt
- `backend/tests/test_hub_service.py` -- adapter les tests de `check_repo_access` (mock du subprocess `git ls-remote`)

## Tasks & Acceptance

**Execution:**
- [x] `backend/alembic/versions/xxxx_add_space_origin_and_credential.py` -- migration ajoutant `origin` (String, défaut `discovered`) et `encrypted_credential` (Text, nullable) sur `spaces`, et supprimant la table `git_repos_config` -- unifie le modèle de données (`0a2ae1447e3a_add_space_origin_and_credential.py`)
- [x] `backend/app/hub/credentials.py` -- `encrypt_credential`/`decrypt_credential` via Fernet, clé issue de `REPO_CREDENTIAL_ENCRYPTION_KEY` (fallback dev, même convention que `JWT_SECRET_KEY`) -- stockage sûr du token
- [x] `backend/app/hub/service.py` -- `check_repo_access` exécute réellement `git ls-remote` (timeout ~6s, thread pool) avec injection du credential déchiffré via `GIT_ASKPASS` pour les identifiants HTTPS ; `get_or_create_space` accepte un paramètre `origin` -- vérification d'accès réelle
- [x] `backend/app/hub/router.py` -- supprimer les endpoints `git-repos-config` ; ajouter `GET /hub/admin/repos` (liste des `Space`, avec `has_credential` calculé), `POST /hub/admin/repos` (ajout manuel, `origin=manual`, déclenche vérification), `PATCH /hub/admin/repos/{id}/credential` (enregistre le credential chiffré, redéclenche vérification) -- API admin multi-repos
- [x] `backend/app/hub/git_repos_config_models.py`, `backend/app/hub/git_repos_config_service.py` -- supprimer -- obsolètes
- [x] `backend/pyproject.toml`, `.env.example` -- ajouter `cryptography` et documenter `REPO_CREDENTIAL_ENCRYPTION_KEY`
- [x] `ihm/app/hub/admin/system-administration/git-repos-config/GitReposProjectConfig.tsx` -- table des dépôts (identifiant, origine, `StatusPill`), formulaire d'ajout manuel, action "Autoriser l'accès" (champ token) par ligne `pending` -- UI multi-repos
- [x] `ihm/app/hub/admin/system-administration/page.tsx` -- remplacer le fetch/save mono-config par la liste `/hub/admin/repos` et les nouvelles actions -- intégration
- [x] `backend/tests/test_hub_service.py` -- réécrire les tests de `check_repo_access` avec `subprocess.run` mocké (repo public accessible, repo privé refusé, credential valide qui débloque l'accès) -- couvre la matrice I/O (+ `backend/tests/test_hub_admin_repos_router.py`, nouveau, pour la couverture bout-en-bout des endpoints admin)

**Acceptance Criteria:**
- Given un admin authentifié ouvre System Administration, when la page charge, then il voit la liste de tous les dépôts connus (découverts et ajoutés manuellement) avec leur statut
- Given un admin saisit l'URL d'un nouveau dépôt, when il valide, then un `Space` `origin=manual` est créé et une vérification d'accès réelle est immédiatement effectuée
- Given un dépôt est en statut `pending` (privé/inaccessible), when l'admin renseigne un token d'accès, then le credential est chiffré et stocké, l'accès est revérifié, et le statut passe à `active` si l'accès réussit
- Given le Backend est injoignable, when l'admin tente une action de sauvegarde, then l'action est désactivée et le toast "Reconnecting…" apparaît

## Spec Change Log

- Post-review patch round (blind-hunter/edge-case-hunter/verification-gap, triaged against baseline `db87623709a2fe5c3b2435852942688830e72260`): no reword of the frozen Intent/Boundaries/Matrix -- these were implementation gaps, not spec ambiguities. Applied as code changes (see below); the `.git`-substring parsing bug and the migration's non-restorable downgrade were routed to `deferred-work.md` instead, left alone here.
  - `check_repo_access` now format-validates (`is_valid_technical_identifier`) before ever spawning `git ls-remote`, closing an injection/SSRF gap on the WebSocket `client_identity_report` path (which never went through the admin endpoint's validation) -- this is the single choke point every caller goes through now.
  - `POST /hub/admin/repos` no longer blocks the event loop or double-invokes `git`: `get_or_create_space` itself runs in a threadpool and its one internal check is authoritative.
  - `PATCH /hub/admin/repos/{id}/credential` rejects a non-string credential, a credential containing `\n`/`\r`, and a credential for a non-`https://` repo (SSH or bare `http://`) -- all previously silently accepted/stored but never usable.
  - `GIT_ASKPASS` script now answers the Username prompt with a placeholder and only the Password prompt with the real credential (conventional PAT auth), and its own tempfile-creation failure is now caught and cleaned up rather than escaping as an uncaught 500.
  - Frontend: dedupes the repos table by `id` on re-add, gives `http://` pending repos their own accurate fallback message instead of mislabeling them as SSH, and falls back to the raw `origin` string for an unrecognized value.
  - New/extended tests: `backend/tests/test_hub_service.py` (injection rejection, askpass failure handling, username/password script branching), `backend/tests/test_hub_admin_repos_router.py` (single-`git`-call assertion, all four new credential-validation 400s), `backend/tests/test_realtime.py` (`client_identity_report` happy path + malicious-identifier regression).

## Design Notes

`check_repo_access` reste appelée en thread pool (comme aujourd'hui dans `_process_client_identity`) pour ne jamais bloquer la boucle asyncio. Pour un identifiant HTTPS (`https://host/org/repo.git`) avec credential, réinjecter le token via `GIT_ASKPASS` (petit script temporaire lisant une variable d'environnement) plutôt que dans l'URL ou l'argv, pour éviter qu'il apparaisse dans `ps`/les logs. Un identifiant SSH (`git@host:org/repo.git`) est vérifié sans credential ; le champ credential reste désactivé pour ces lignes dans l'UI.

## Verification

**Commands:**
- `cd backend && uv run pytest tests/test_hub_service.py -q` -- expected: tous les tests passent, y compris les nouveaux cas mockés `git ls-remote`
- `cd backend && uv run alembic upgrade head` -- expected: migration appliquée sans erreur
- `cd ihm && npm run build` -- expected: build Next.js réussit

**Manual checks (if no CLI):**
- Ajouter un dépôt public manuellement dans l'UI admin → il passe à `active`
- Ajouter un dépôt privé sans credential → reste `pending`, action "Autoriser l'accès" visible ; renseigner un token valide → passe à `active`

## Suggested Review Order

**Vérification d'accès réelle et point de contrôle unique**

- Point d'entrée : format-valide avant tout `subprocess`, seul point de passage pour tous les appelants (admin + découverte WebSocket).
  [`service.py:316`](../../backend/app/hub/service.py#L316)

- Rejette un identifiant malformé avant même de construire l'environnement `GIT_ASKPASS`.
  [`service.py:64`](../../backend/app/hub/service.py#L64)

- Injection du credential déchiffré via `GIT_ASKPASS`, jamais dans l'URL/argv ; script distinct pour prompt Username vs Password.
  [`service.py:271`](../../backend/app/hub/service.py#L271)

- `get_or_create_space` accepte désormais `origin` pour distinguer découverte vs saisie admin, sans dupliquer le schéma d'identité.
  [`service.py:161`](../../backend/app/hub/service.py#L161)

**Endpoints admin multi-repos**

- Ajout manuel : tourne entièrement en threadpool, une seule vérification `git`, jamais de transition directe vers `active`.
  [`router.py:119`](../../backend/app/hub/router.py#L119)

- Autorisation d'un dépôt privé : valide le credential (type, absence de retour à la ligne, dépôt HTTPS) avant chiffrement et re-vérification.
  [`router.py:159`](../../backend/app/hub/router.py#L159)

- Liste des dépôts : jamais le credential en clair, seulement `has_credential`.
  [`router.py:82`](../../backend/app/hub/router.py#L82)

**Chiffrement des credentials au repos**

- Clé dérivée par SHA-256 de `REPO_CREDENTIAL_ENCRYPTION_KEY`, même convention que `JWT_SECRET_KEY`.
  [`credentials.py:19`](../../backend/app/hub/credentials.py#L19)

- Chiffrement/déchiffrement Fernet du token stocké.
  [`credentials.py:34`](../../backend/app/hub/credentials.py#L34)

**Modèle de données unifié**

- `Space` gagne `origin` et `encrypted_credential` — reste la source de vérité unique (AD-007).
  [`models.py:43`](../../backend/app/hub/models.py#L43)

- Migration ajoute les deux colonnes et supprime `git_repos_config` ; downgrade non restaurateur (suivi en `deferred-work.md`).
  [`0a2ae1447e3a_add_space_origin_and_credential.py:21`](../../backend/alembic/versions/0a2ae1447e3a_add_space_origin_and_credential.py#L21)

**UI admin multi-repos**

- Table des dépôts + formulaire d'ajout + action d'autorisation par ligne `pending`.
  [`GitReposProjectConfig.tsx:60`](../../ihm/app/hub/admin/system-administration/git-repos-config/GitReposProjectConfig.tsx#L60)

- Distinction HTTPS (autorisable) vs SSH/`http://` (message adapté, pas de credential).
  [`GitReposProjectConfig.tsx:49`](../../ihm/app/hub/admin/system-administration/git-repos-config/GitReposProjectConfig.tsx#L49)

- Intégration : liste `/hub/admin/repos`, ajout et autorisation avec dédoublonnage par `id`.
  [`page.tsx:74`](../../ihm/app/hub/admin/system-administration/page.tsx#L74)

**Tests**

- Couverture de la faille corrigée : rejet d'un identifiant `ext::` malveillant côté WebSocket, sans jamais atteindre `subprocess`.
  [`test_realtime.py:232`](../../backend/tests/test_realtime.py#L232)

- Vérification d'accès réelle : cas mockés public/privé/SSH/timeout/credential.
  [`test_hub_service.py:119`](../../backend/tests/test_hub_service.py#L119)

- Couverture bout-en-bout des 6 scénarios de la matrice I/O.
  [`test_hub_admin_repos_router.py:52`](../../backend/tests/test_hub_admin_repos_router.py#L52)
