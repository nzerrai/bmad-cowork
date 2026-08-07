- source_spec: `spec-0-1-project-scaffolding-and-dev-environment.md`
  summary: The new `.github/workflows/ci.yml` pipeline has never executed on GitHub Actions itself — no git remote exists yet and nothing has been pushed, so only the underlying shell commands were verified locally.
  evidence: Verification-gap review confirmed no `actionlint`/`act`/nektos tooling exists in the repo to validate the workflow offline, and the repo has zero commits pushed to any remote; first real PR will be the first execution of this workflow on its actual target platform.

- source_spec: `spec-0-1-project-scaffolding-and-dev-environment.md`
  summary: Local PostgreSQL credentials/port (`bmad`/`bmad`/`bmad_portal`/`5433`) are hand-duplicated between `docker-compose.yml` and `.github/workflows/ci.yml`'s backend service container, with no single source of truth enforcing they stay in sync.
  evidence: Adversarial and verification-gap review both independently flagged this duplication; low risk today (fixed, non-production dev credentials) but worth consolidating (e.g. a shared `.env`/composite action) once a second consumer of this config appears.

- source_spec: `spec-0-2-authentication-and-rbac-foundation.md`
  summary: `POST /auth/login` and `POST /auth/register` have no rate limiting or brute-force protection, leaving them open to credential stuffing and mass account-creation spam.
  evidence: Adversarial review flagged the absence of any throttling; real gap but infra-level (needs middleware + request-counting storage), not a trivial one-file patch, and no requirement for it exists in this story's spec.

- source_spec: `spec-0-2-authentication-and-rbac-foundation.md`
  summary: The `users` table migration creates a native Postgres enum literally named `role`, a generic identifier in the shared schema namespace that risks colliding with an unrelated future "role" concept (e.g. a database role reference or project-role table).
  evidence: Adversarial review flagged the name choice; low urgency today (only consumer), but a rename later requires an `ALTER TYPE ... RENAME` migration rather than being free, so worth tracking before a second "role" concept appears.
