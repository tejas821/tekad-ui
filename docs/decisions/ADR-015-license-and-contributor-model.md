# ADR-015 — Licence & contributor model

**Status:** Accepted · **Date:** 2026-08-27
**Evidence:** `docs/research/14-license-analysis.md`. **Not legal advice.**

## Decision
**Apache-2.0**, with **no NOTICE file at launch** (§4(4) binds only if the
licensor ships one), plus a **`TRADEMARK.md`** stating the name and logo are
not licensed under Apache-2.0, with permitted nominative use.

**Contributor model: DCO. No CLA.**

## Reason
- **Express patent grant** with defensive termination. MIT gives none.
- **§6 withholds the name at licence level** — a fork gets the code, not the
  right to call itself TEKAD. For a founder whose brand is the asset this is
  Apache-2.0's most under-discussed advantage.
- **§4(2)** forces hostile forks to mark modifications.
- **Zero new compliance cost.** `rxjs` — a mandatory peer of every Angular app
  — is already Apache-2.0, and Angular CLI emits `3rdpartylicenses.txt` by
  default. Taiga UI and ng-primitives are also Apache-2.0.
- **DCO gives provenance without the capacity to relicense.** Under §5
  contributions arrive under Apache-2.0 automatically and §3 supplies the
  patent grant a CLA would add. Every relicensing incident — MongoDB 2018,
  Elastic 2021, HashiCorp 2023, PrimeNG 2026 — involved single-vendor
  copyright control. A visible CLA on a new Angular UI library in 2026 reads
  as preserving the option PrimeTek just exercised.

## Alternatives
MIT — shorter and matches Angular core, but no patent protection and no
licence-level name reservation. BSD-3 — its non-endorsement clause is a weak
§6 analogue. MPL-2.0 — file-scoped copyleft turns routine theming edits into a
compliance event. GPL/LGPL/AGPL — an Angular library is tree-shaken into the
consumer's bundle; commercially fatal.

## Consequences accepted knowingly
**Without a CLA, TEKAD cannot unilaterally relicense contributed code.** If the
founder wants that option, the honest path is a CLA disclosed prominently from
day one — **not a DCO now and a CLA later**, which is the move that destroys
trust. A future commercial tier should live in a separately owned repository so
the open core never needs relicensing.

**Audit rule:** the npm `license` **field** is a screening signal, not
evidence — PrimeNG's went opaque at v18, four majors before the substantive
change at v22. The CI licence gate reads the LICENSE file.

**Blocked:** `LICENSE` is not committed until the trademark and namespace
questions in ADR-016 are resolved.
