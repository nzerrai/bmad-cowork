# Spine Pair Review — BMad Portal (Hub) / tarmacacademy

## Overall verdict
The pair is structurally shaped correctly — section order is canonical in both files, and the new Contributor Detail addition is IA/flow-name consistent on the surface — but it fails the source-extraction test. DESIGN.md's token layer is names-only with no resolvable hex/px/rem values anywhere, so the linked mock had to invent its entire concrete palette, radius, and font stack unilaterally, and the mock also introduces visual patterns (avatar header, alert banner, dot-glow status pill) with no component definition backing them — the logged ".memlog.md" claim that Contributor Detail "reuses existing identity entirely" does not fully hold up. Separately, three of four Key Flows are single-sentence arrow chains missing numbered steps, protagonists, climaxes, and failure paths, and UI-lifecycle states (empty/error/offline/permission-denied) are entirely unaddressed for all six IA surfaces.

## 1. Flow coverage — broken
Checked all 4 Key Flows (EXPERIENCE.md lines 50-53) against: named protagonist, numbered steps, climax beat, failure path.
### Findings
- **critical** "The Dev Loop," "The PM Pulse," and "The Auditor's Audit" (EXPERIENCE.md lines 50-52) each have no named protagonist, no numbered steps, no explicit climax marker, and no failure path — each is a single arrow-chain sentence, not a flow spec. *Fix:* expand each into numbered steps with a named persona, a `**Climax:**` line, and a `Failure:` line, matching the shape used in experience-example-shadcn.md Flow 1/2.
- **high** "Karim's Risk Check" (EXPERIENCE.md line 53) has a named protagonist and an implied climax ("messages her directly instead of guessing") but is still one unbroken sentence rather than numbered steps, and has no failure branch (e.g., what if the repo-state heartbeat is stale when Karim opens the panel?). *Fix:* number the steps, mark the climax explicitly, add a failure case.
- **medium** None of the 4 flows specifies what happens when the flow's own trigger fails to resolve (Re-sync fails in Flow 2, Compliance Gate errors in Flow 3, rebase actually can't be confirmed in Flow 4) — failure paths are absent from the entire Key Flows section. *Fix:* add at least one failure branch per flow, as the rubric and canonical examples both require "where applicable."

## 2. Token completeness — broken
Extracted DESIGN.md frontmatter (title/status/updated only — no `colors:`, `typography:`, `rounded:`, `spacing:` blocks) and every prose token reference in the body (Colors, Typography, Layout & Spacing, Shapes).
### Findings
- **critical** DESIGN.md frontmatter defines zero machine-extractable tokens (DESIGN.md lines 1-5); every color, font, radius, and spacing value in the body is name-only prose (lines 13-53), unlike all three reference example DESIGN.md's, which all carry hex/px token blocks in frontmatter.
- **critical** The Colors section names 6 status colors plus 2 context treatments (Emerald/Green, Amber/Orange, Rose/Red, Sky Blue/Cyan, Indigo/Violet, Slate/Grey, Local Context, Remote Context — DESIGN.md lines 14-25) with no hex codes anywhere. The linked mock (mockups/contributor-card.html lines 15-26) had to invent its own hex values (`#34d399`, `#f5a524`, `#fb6478`, `#38bdf8`, `#8b8cf8`, `#7885a3`, plus a full surface/background ramp) with nothing in DESIGN.md to verify or constrain them against. *Fix:* add a `colors:` frontmatter block with hex pairs (light/dark or single dark-mode value) for every named token.
- **high** Typography leaves both font families as open examples rather than decisions ("e.g., Inter, Geist, or similar"; "e.g., JetBrains Mono, Fira Code" — DESIGN.md lines 28-29) and defines no sizes, weights, or line-heights at all. *Fix:* lock one font per role and add a size/weight scale.
- **high** Shapes gives no radius value ("Slightly rounded corners (medium radius)" — DESIGN.md line 39); the mock independently chose 12px/8px (mockups/contributor-card.html lines 31-33) with no DESIGN.md value to check against. *Fix:* add a `rounded:` scale with concrete px/rem values.
- **medium** Layout & Spacing defines no numeric spacing scale at all (DESIGN.md lines 31-33), unlike all three reference examples, which give an explicit scale (e.g., 4/8/12/16/24/32).

## 3. Component coverage — broken
Extracted every component name in DESIGN.md.Components, EXPERIENCE.md.Component Patterns, and inline mentions in IA/Key Flows; cross-checked each has a row in both files.
### Findings
- **critical** "Contributor Detail Panel" (EXPERIENCE.md line 30, added 2026-08-06) has no DESIGN.md.Components row. The logged decision (.memlog.md) states it "reuses existing identity entirely," but the linked mock (mockups/contributor-card.html) introduces visual patterns with no definition anywhere in either spine: a gradient-avatar identity header (lines 90-103), a tinted alert banner for the conflict state (lines 193-206), a dot-plus-glow status pill (lines 133-157), and key-value card rows that are not the "Real-time data tables with status-driven cells" DESIGN.md actually defines (no `<table>` markup, no data-table pattern, in the mock at all). The reuse claim does not hold up under inspection of the artifact it's based on. *Fix:* either add these as named DESIGN.md components, or revise the mock to compose strictly from the four components DESIGN.md already defines.
- **high** "Real-time Status Bars" (EXPERIENCE.md line 26) has no matching row in DESIGN.md.Components — a behavioral spec with no visual spec to back it. *Fix:* add a DESIGN.md.Components row, or rename to match an existing one.
- **high** "Dynamic status badges" (DESIGN.md line 44) has no row of its own in EXPERIENCE.md.Component Patterns — it's referenced only as an ingredient inside the Contributor Detail Panel description, never given independent behavioral rules, despite being the component the new IA entry says is a primary entry point ("reached from any status badge... that names them," EXPERIENCE.md line 19). *Fix:* add a Component Patterns row for Dynamic status badges with click/hover/navigation behavior.
- **medium** DESIGN.md's "Real-time data tables with status-driven cells" (line 43) is renamed to "Data-heavy Tables" in EXPERIENCE.md (line 27) — same concept, different name, breaking exact-name lookup between the two files. *Fix:* use one name in both.

## 4. State coverage — broken
Walked all 6 IA surfaces (Dashboard, Synchronization Center, Artifact Management, Sprint & Claim Management, System Administration, Contributor Detail) against expected UI-lifecycle states (empty, cold-load, focus, error, offline, permission-denied).
### Findings
- **critical** EXPERIENCE.md's "State Patterns" section (lines 32-38) documents data/status states (sync-health colors) only, not UI-lifecycle states. No IA surface has a specified empty state, cold-load/skeleton state, or error state anywhere in the document. *Fix:* add a per-surface state table (see experience-example-shadcn.md's State Patterns for the shape) covering at minimum cold-load and empty for each of the 6 surfaces.
- **high** System Administration ("Role management, and Governance," EXPERIENCE.md line 18) has no permission-denied state defined anywhere, despite RBAC being implied by its own description. *Fix:* specify what a non-admin sees (hidden nav item vs. blocked screen), matching the precedent in experience-example-shadcn.md's "Permission denied" row.
- **high** Contributor Detail has no error/stale-data state: if the WebSocket heartbeat (AD-002) feeding repo state (EXPERIENCE.md lines 19, 30) is down or stale, nothing specifies fallback treatment, even though live repo state is the panel's entire premise.
- **medium** Accessibility Floor claims "Full keyboard accessibility for complex data tables" (EXPERIENCE.md line 47) but no visible-focus state/treatment is defined anywhere in either file.

## 5. Visual reference coverage — adequate
Listed mockups/ (1 file: contributor-card.html), imports/ (empty), wireframes/ (does not exist). Checked inline linking and stated precedence.
### Findings
- **high** Neither file states "spine wins on conflict" anywhere. The canonical shape requires this stated once, and it is not a formality here: the mock (mockups/contributor-card.html) invents concrete hex/radius/font-stack values that don't exist in DESIGN.md, so without a stated precedence rule a downstream consumer has no way to know DESIGN.md's (absent) values should win over the mock's (present) ones. *Fix:* add a one-line precedence statement in EXPERIENCE.md's IA section, as in both reference examples.
- **low** The single mock is linked inline at the relevant IA entry with a description (EXPERIENCE.md line 19) — no orphans, no vague references.

## 6. Bloat & overspecification — strong
Checked both files for pixel-restatement, source restatement, prose-where-a-table-works, unread sections, and decorative narrative.
### Findings
- **low** No meaningful bloat found; if anything both files are terser than the reference examples. DESIGN.md prose stays within editorial voice appropriate to that file; EXPERIENCE.md prose stays functional (the Karim flow's closing clause ties to the panel's stated purpose rather than decorating).

## 7. Inheritance discipline — thin
Checked component-name identity across both files and token-reference resolution/style consistency.
### Findings
- **high** Component names are not identical across both files in 3 of 5 cases — see Component coverage findings above ("Data-heavy Tables" vs. "Real-time data tables with status-driven cells"; "Real-time Status Bars" and "Contributor Detail Panel" unmatched in DESIGN.md).
- **low** Semantic color-name style (`Emerald / Green`, etc.) is used consistently in both files with no `{path.to.token}` syntax mixed in anywhere — a genuine strength, and the one place inheritance actually works cleanly.

## 8. Shape fit — adequate structure, thin substance
Checked DESIGN.md section order against canonical order and EXPERIENCE.md against the 8 required defaults.
### Findings
- **medium** DESIGN.md's frontmatter carries none of the machine-extractable token data (`colors:`, `typography:`, `rounded:`, `spacing:`) that all three reference DESIGN.md examples use — section order is canonical, but the file functions as narrative documentation rather than a token source.
- **medium** EXPERIENCE.md's Information Architecture (lines 13-19) uses a bulleted prose list instead of the canonical `Surface | Reached from | Purpose` table; 5 of 6 surfaces don't state how they're reached, unlike the new Contributor Detail entry, which does.
- **low** Responsive & Platform and Inspiration & Anti-patterns are omitted — both optional in the canonical shape; omission is plausible for a desktop-first "Dashboard-driven" command center but is not explicitly justified in either file.
- **low** All 8 required EXPERIENCE.md sections are present and in canonical order (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows).

## Mechanical notes
- No broken cross-references found: the `mockups/contributor-card.html` link in EXPERIENCE.md line 19 resolves correctly; `imports/` is empty and `wireframes/` doesn't exist (neither is required).
- Neither file's frontmatter includes a `sources:` field pointing back to a PRD or brief, unlike both example EXPERIENCE.md's (`sources: - {planning_artifacts}/prds/...`) — traceability to requirements is not established in-doc.
- No Mermaid diagrams present in either file (nothing to validate there).
- Title strings are consistent across files ("BMad Portal (Hub)" appears identically in both H1s).
- IA entry name and Key Flow name for the new surface are consistent: "Contributor Detail (Fiche Contributeur)" (EXPERIENCE.md line 19) and "Fiche Contributeur" (line 53) refer to the same surface without drift.
