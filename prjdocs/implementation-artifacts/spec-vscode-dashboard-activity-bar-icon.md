---
title: 'Icône de barre d''activité pour le dashboard VS Code'
type: 'feature'
created: '2026-08-12'
status: 'done'
route: 'one-shot'
---

## Intent

**Problem:** Le webview du dashboard était déclaré via une clé de contribution `webviewViews`, qui n'est pas un point de contribution VS Code reconnu, et l'icône `media/icon.svg` déjà présente dans le dépôt n'était référencée nulle part — le dashboard n'avait donc aucune icône cliquable pour l'afficher.

**Approach:** Remplacer cette déclaration invalide par les points de contribution standards `viewsContainers` (barre d'activité) et `views`, pour créer une icône dédiée "BMad Portal" dans la barre d'activité qui révèle la vue `bmadPortal.dashboard`. La commande `bmad-portal.openDashboard` est mise à jour pour focaliser directement cette vue via la commande auto-générée `<viewId>.focus`, avec un repli si elle échoue.

## Suggested Review Order

**Contribution de la barre d'activité**

- Nouveau conteneur `viewsContainers.activitybar` avec l'icône `media/icon.svg`, remplace l'ancienne clé `webviewViews` invalide.
  [`package.json:116`](../../vscode-extension/package.json#L116)

- Déclaration `views` qui rattache la vue webview `bmadPortal.dashboard` au conteneur — l'id doit rester synchronisé avec `DashboardWebviewViewProvider.viewType`.
  [`package.json:125`](../../vscode-extension/package.json#L125)

**Commande d'ouverture du dashboard**

- La commande utilise désormais la constante `DashboardWebviewViewProvider.viewType` plutôt qu'une chaîne dupliquée, avec repli si la commande `.focus` échoue.
  [`extension.ts:90`](../../vscode-extension/src/extension.ts#L90)

**Documentation**

- Corrige l'id de commande et l'id de vue obsolètes documentés pour cette fonctionnalité.
  [`README.md:49`](../../vscode-extension/README.md#L49)
