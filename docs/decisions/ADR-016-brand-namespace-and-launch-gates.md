# ADR-016 — Brand, namespace & publish gates

**Status:** Accepted (as gates) · **Date:** 2026-08-27
**Evidence:** `docs/research/15-trademark-brand-research.md`. **Not legal advice.**

## Context
Preliminary conflict research only. No official trademark register — IP India,
USPTO, EUIPO/TMview, WIPO — was reachable by automated research.

## Findings
- **npm:** no published package under `tekad`, `tekad-ui`, `tekadui`, `@tekad`
  or `@tekad-ui`. But scope **reservation** is not publicly detectable.
- **GitHub:** `github.com/tekad` **exists** as a dormant, empty user account.
  `tekad-ui` and `tekadui` are free.
- **Existing use:** TEKAD is a common Indonesian/Malay word ("determination").
  An active Indonesian government programme runs public web software under the
  name; at least six corporate users exist in ID/MY; **TEKADA** is a Batam
  software company one letter away. **No developer-tool or library use found.**
- **Domains:** `.dev`, `.io`, `.net`, `tekadui.dev` show no A record;
  `.com`, `.org`, `.id`, `.co.id` resolve. RDAP was blocked — not authoritative.

## Decision — namespace
**`@tekad/*`**, matching the ecosystem convention where the scope is the
project and the package is the module. `@tekad-ui/core` stutters the category
and forecloses non-UI expansion (CLI, ESLint plugin, schematics).
**Fallback `@tekad-ui/*`** if the scope is reserved — it pairs consistently
with the free `github.com/tekad-ui` and `tekadui.dev`.

## Publish gates — all must pass before anything is published
1. `npm org ls tekad` authenticated, or a throwaway `@tekad/probe` publish, to
   settle scope availability. Note the correlation risk: the same person may
   hold both `github.com/tekad` and the npm scope.
2. **Register the scope and squat-protection placeholders (`tekad`,
   `tekad-ui`, `ngx-tekad`) BEFORE announcing the name publicly.** Every future
   package name is reserved before it appears in a public commit.
3. Authoritative WHOIS/RDAP on `tekad.dev`, `tekad.io`, `tekadui.dev`.
4. Re-run all four official trademark registers from a browser session capable
   of CAPTCHA and JavaScript.
5. Professional clearance for India, Indonesia and Malaysia, classes 9 and 42.
   Attorney question list in `docs/research/15-trademark-brand-research.md`.

## Risk classification
npm LOWER APPARENT CONFLICT · GitHub POTENTIAL CONFLICT · existing software use
POTENTIAL CONFLICT · **trademark REQUIRES PROFESSIONAL SEARCH** · domains
POTENTIAL CONFLICT.

> Based on the sources reviewed, these risks appear lower/higher, but formal
> trademark and IP clearance should be obtained from a qualified attorney
> before commercial launch or registration.
