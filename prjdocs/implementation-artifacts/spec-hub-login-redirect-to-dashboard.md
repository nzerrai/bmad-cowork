---
title: 'Redirection de la connexion Hub vers le tableau de bord'
type: 'bugfix'
created: '2026-08-12'
status: 'done'
route: 'one-shot'
---

## Intent

**Problem:** Après une connexion réussie, l'utilisateur était redirigé vers `/artifacts` (Artifact Health) au lieu du tableau de bord réel du Hub (`/hub/dashboard`, Story 3.3).

**Approach:** Changer la cible de `router.push` dans la page de login pour pointer vers `/hub/dashboard`, et mettre à jour le test et la documentation qui référençaient l'ancienne redirection.

## Suggested Review Order

- Le seul point de décision : la cible de redirection post-login.
  [`page.tsx:34`](../../ihm/app/login/page.tsx#L34)

- Le test composant vérifie désormais la nouvelle cible attendue.
  [`login.test.tsx:51`](../../ihm/__tests__/login.test.tsx#L51)

- Le guide de contribution reflète le nouveau parcours (login → dashboard, puis navigation manuelle vers `/artifacts`).
  [`CONTRIBUTING.md:186`](../../CONTRIBUTING.md#L186)
