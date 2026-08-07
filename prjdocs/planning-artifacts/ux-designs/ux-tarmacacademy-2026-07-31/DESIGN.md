---
title: "BMAD Portal MVP - Artifact & Team Sync Hub"
status: final
created: 2026-07-31
updated: 2026-07-31
colors:
  primary: "#6200ea"
  primaryDark: "#3700b3"
  secondary: "#03dac6"
  background: "#f8f9fa"
  surface: "#ffffff"
  error: "#b00020"
  success: "#00c853"
  warning: "#ffab00"
  info: "#018786"
typography:
  fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
  h1Size: "24px"
  h2Size: "20px"
  h3Size: "16px"
  bodySize: "14px"
  smallSize: "12px"
rounded: "8px"
spacing: "16px"
components: "MUI (Material Design) - Customized for Commercial SaaS"
---

# BMAD Portal MVP - Design Specification

## Brand & Style

**Register:** Commercial SaaS - Moderne, épurée, prête pour la commercialisation.  
**Ton visuel:** Professionnel mais accueillant, capable de convertir un utilisateur interne en ambassadeur du produit.  
**Philosophie:** Espacements généreux, typographie claire, composants MUI customisés avec des coins légèrement arrondis. Orientée conversion et onboarding.

## Colors

Thème **Vibrant Innovation** sélectionné pour son potentiel commercial :

| Token | Hex Code | Usage |
|-------|----------|-------|
| Primary | `#6200ea` | Actions principales, navigation active, liens principaux |
| Primary Dark | `#3700b3` | Hover sur actions principales, états actifs profonds |
| Secondary | `#03dac6` | Accents visuels, badges, éléments décoratifs |
| Background | `#f8f9fa` | Fond global de l'application |
| Surface | `#ffffff` | Cartes, headers, sections délimitées |
| Error | `#b00020` | Signaux d'erreur, quality gates fail, stories en risque critique |
| Success | `#00c853` | Statuts connectés, progressions réussies, quality gates pass |
| Warning | `#ffab00` | Alerts, PRs en attente, statuts cache, quality gates pending |
| Info | `#018786` | Informations contextuelles, cérémonies à venir |

## Typography

- **Font Family:** `'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`
- **Heading 1 (24px):** Titles de pages, headers principaux
- **Heading 2 (20px):** Titles de sections majeures
- **Heading 3 (16px):** Titles de cartes, headers de widgets
- **Body (14px):** Texte courant, descriptions
- **Small (12px):** Metadonnées, timestamps, labels secondaires

## Layout & Spacing

- **Grid system:** Multi-surface responsive, break-points mobile-first
- **Base spacing unit:** 16px
- **Card padding:** 16px-20px
- **Gap between elements:** 12px-24px selon la hiérarchie
- **Container max-width:** 1400px pour desktop, 100% pour mobile avec padding adaptatif

## Elevation & Depth

- **Card shadow:** `0 1px 3px rgba(0,0,0,0.1)` pour les cartes standard
- **Hover elevation:** `0 4px 16px rgba(0,0,0,0.1)` pour les éléments interactifs au hover
- **Header border:** `1px solid #e0e0e0` pour délimiter les sections sans utiliser d'ombres lourdes

## Shapes

- **Border radius standard:** `8px` pour les cartes et containers
- **Border radius small:** `4px` pour les boutons et inputs
- **Border radius pill:** `16px` pour les badges et status indicators
- **Corners:** Légèrement arrondis pour un rendu commercial moderne

## Components

Système **MUI (Material Design)** customisé pour le style Commercial SaaS :

| Component | Specification |
|-----------|---------------|
| Buttons | Rounded 4px, primary #6200ea, hover #3700b3, outlined variant avec border #e0e0e0 |
| Cards | Elevation légère, border-radius 8px, padding 16-20px |
| Badges | Pill shape (16px radius), colors sémantiques (success #00c853, warning #ffab00, error #b00020) |
| Progress bars | Height 8-12px, border-radius 4px, gradient fill pour success |
| Status indicators | Dot + text, pill background, sémantique par couleur |
| Data grids | Rows with border-bottom #e0e0e0, hover background #f9f9f9 |
| Navigation | Horizontal tabs ou sidebar selon surface, active state avec border-bottom ou background tint |

## Do's and Don'ts

**DO:**
- Utiliser le thème Vibrant Innovation avec ses couleurs sémantiques MUI
- Maintenir des espacements généreux pour une lecture aérée
- Privilégier les cartes avec ombres légères pour la hiérarchie visuelle
- Utiliser les badges pill-shaped pour les statuts et indicateurs
- Gardez le ton visuel commercial mais professionnel

**DON'T:**
- Ne pas utiliser de thèmes sombres par défaut (sauf si demandé spécifiquement)
- Ne pas surcharger avec des ombres lourdes ou des effets 3D
- Ne pas mélanger les directions de design (Classique Material vs Dark vs SaaS)
- Ne pas utiliser de lorem ipsum ou de texte générique dans les maquettes finales
- Ne pas introduire de patterns visuels non documentés dans cette spécification
