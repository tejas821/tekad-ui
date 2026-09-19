# Licence Analysis & Dependency Matrix

Research date 2026-08-27. **Not legal advice.** Claims are labelled
FACT (primary source) / INTERPRETATION / LEGAL QUESTION.

## Recommendation: Apache-2.0

**FACT — Apache-2.0 mechanics** (apache.org/licenses/LICENSE-2.0.txt):
§2 perpetual, irrevocable, royalty-free copyright grant. §3 express patent
grant, with **defensive termination** — filing patent litigation alleging the
Work infringes terminates _your_ patent licences (copyright grant survives).
§4 four conditions: supply the licence; **mark modified files**; retain
notices in Source form of derivatives; reproduce the NOTICE file _if the
licensor ships one_. §6 **trademark exclusion** — the licence does not grant
permission to use the licensor's names or marks.

### Why Apache-2.0 for TEKAD

- **Patent grant.** MIT gives none. Under MIT a contributor could contribute
  patented code and later assert it.
- **§6 is a licence-level statement that the TEKAD name is not conveyed with
  the code.** For a founder whose brand is the asset, this is Apache-2.0's
  most under-discussed advantage. MIT has no equivalent.
- **§4(2)** forces hostile forks to mark their modifications.
- **Zero new compliance cost for consumers.** `rxjs` — a mandatory peer of
  every Angular app — is _already_ Apache-2.0. Every Angular application on
  earth already ships Apache-2.0 code and satisfies its notice conditions.
  Angular CLI emits `3rdpartylicenses.txt` for production builds by default.
- **In-ecosystem precedent:** Taiga UI (largest independent Angular library)
  and ng-primitives both chose Apache-2.0.

### Launch shape

**Apache-2.0, with no NOTICE file at launch** — §4(4) only binds if the
licensor ships one, so omitting it keeps downstream obligations to the licence
copy and existing notices. Add a **`TRADEMARK.md`** stating that the name and
logo are not licensed under Apache-2.0, with permitted nominative use
("built with TEKAD").

### Why not the alternatives

- **MIT** — shortest, most recognised, matches Angular core. But no patent
  protection and no licence-level name reservation.
- **BSD-3-Clause** — its non-endorsement clause is a weak analogue of §6.
- **MPL-2.0** — copyleft is **file-scoped**. A consumer editing one `.scss` to
  theme a component triggers source disclosure for that file. UI libraries are
  vendored and patched constantly; MPL turns routine behaviour into a
  compliance event.
- **GPL/LGPL/AGPL** — an Angular library is compiled and tree-shaken into the
  consumer's single application bundle, which is plausibly a derivative work;
  commercially fatal. LGPL's relinking carve-out was designed for dynamically
  linked C shared objects and does not map onto minified, tree-shaken ESM.
  AGPL §13 is worse, since network-served software _is_ the deployment target.

**LEGAL QUESTION:** does bundling an ESM library into an application bundle
constitute a derivative work or mere aggregation under GPL-family licences in
the relevant jurisdiction?

## Compatibility and downstream flow

MIT code inside an Apache-2.0 project: permitted, retain the MIT notice.
Apache-2.0 code inside an MIT project: permitted, but the Apache-2.0 portion
_stays_ Apache-2.0 and carries §4's conditions. An app that merely
`npm install`s TEKAD takes on **no** source-disclosure duty, **no** obligation
to license its own code any particular way, and **no** obligation to publish
changes unless it redistributes modified TEKAD source. Obligations attach on
distribution; the standard mechanism is the build-emitted third-party licence
file.

**LEGAL QUESTION:** does Angular CLI's default `3rdpartylicenses.txt` satisfy
Apache-2.0 §4(1) and §4(3) for a browser-delivered bundle, given the file is
emitted to the build output but not necessarily served to end users?

## Ecosystem licences — verified 2026-08-27 (npm registry `license` field)

| Project                              | Package                      | Version | Licence        |
| ------------------------------------ | ---------------------------- | ------- | -------------- |
| Angular core / CDK / Aria / Material | `@angular/*`                 | 22.1.4  | MIT            |
| Taiga UI                             | `@taiga-ui/core`             | 5.21.0  | **Apache-2.0** |
| NG-ZORRO                             | `ng-zorro-antd`              | 22.0.1  | MIT            |
| ng-bootstrap                         | `@ng-bootstrap/ng-bootstrap` | 21.0.0  | MIT            |
| Clarity                              | `@clr/angular`               | 18.2.1  | MIT            |
| Radix NG                             | `@radix-ng/primitives`       | 1.1.2   | MIT            |
| ng-primitives                        | `ng-primitives`              | 0.130.1 | **Apache-2.0** |
| Spartan                              | `@spartan-ng/brain`          | 1.3.3   | MIT            |
| Floating UI                          | `@floating-ui/dom`           | 1.8.0   | MIT            |
| RxJS                                 | `rxjs`                       | 7.8.2   | **Apache-2.0** |
| tslib                                | `tslib`                      | 2.8.1   | **0BSD**       |

## Dependency matrix

| Package                              | Licence                | Commercial use | Attribution                        | Copyleft | Patent  | Classification         |
| ------------------------------------ | ---------------------- | -------------- | ---------------------------------- | -------- | ------- | ---------------------- |
| `@angular/core`, `/common`           | MIT                    | Yes            | Notice                             | None     | None    | **peer**               |
| `@angular/forms`                     | MIT                    | Yes            | Notice                             | None     | None    | **optional peer**      |
| `@angular/cdk`                       | MIT                    | Yes            | Notice                             | None     | None    | **peer**               |
| `@angular/aria`                      | MIT                    | Yes            | Notice                             | None     | None    | **peer**               |
| `rxjs`                               | Apache-2.0             | Yes            | Notice + §4                        | None     | **Yes** | **peer**               |
| `tslib`                              | **0BSD**               | Yes            | **None — 0BSD waives attribution** | None     | None    | **runtime dependency** |
| `@floating-ui/dom`                   | MIT                    | Yes            | Notice                             | None     | None    | **runtime dependency** |
| `ng-packagr`, `typescript`, `vitest` | MIT / Apache-2.0 / MIT | Yes            | —                                  | None     | —       | **dev**                |
| `chart.js` (4.5.1)                   | MIT                    | Yes            | Notice                             | None     | None    | **optional peer**      |
| `d3` (7.9.0)                         | ISC                    | Yes            | Notice                             | None     | None    | **optional peer**      |
| `@internationalized/date`            | Apache-2.0             | Yes            | Notice + §4                        | None     | Yes     | **optional peer**      |
| `date-fns` (4.4.0), `luxon` (3.7.2)  | MIT                    | Yes            | Notice                             | None     | None    | **optional peer**      |

**Nothing verified is copyleft. Nothing is forbidden.**

Notes: `tslib` is a real runtime dependency (0BSD carries no notice duty and
Angular's build expects it). `@floating-ui/dom` is a runtime dependency, not a
peer — positioning is an implementation detail, not something consumers
configure. Charting and date libraries are **optional peers**
(`peerDependenciesMeta: {optional: true}`) behind thin adapters; a UI kit must
never force every consumer to carry a charting engine and three date
libraries.

## A methodological finding worth institutionalising

**FACT:** `primeng@17.18.15` → `MIT`. `primeng@18.0.0` onwards →
`SEE LICENSE IN LICENSE.md`. The npm `license` **field** went opaque **four
major versions before** the substantive commercial change at v22.

⇒ **The npm `license` field is a screening signal, not evidence.** Any
SPDX-invalid value (`SEE LICENSE IN …`, `UNLICENSED`) requires reading the
actual LICENSE file, and high-stakes dependencies should be confirmed against
the repository. TEKAD's licence-audit CI gate must check the LICENSE file, not
just the field.

## Contributor IP: DCO, not CLA

**FACT — what each does.** A DCO (v1.1, `Signed-off-by:` trailer) is a
per-commit, publicly auditable certification of provenance. It does **not**
transfer copyright, grant rights beyond the outbound licence, or permit
relicensing. A CLA obtains copyright assignment or a broad sublicensable
licence to the steward — typically including the right to distribute **under
terms of the steward's choosing**.

**FACT — what comparable projects use.** Angular: **CLA** (Google-stewarded).
Taiga UI, NG-ZORRO, ng-bootstrap, Spartan: **neither** — relying on
inbound=outbound (codified for Apache-2.0 in §5). Clarity: unverified for this
repo; VMware operates a DCO generally.

**INTERPRETATION.** The pattern is that corporate stewards use CLAs and
independent Angular UI libraries use neither. **A CLA is precisely the
mechanism that enables a later commercial relicense** — it is what let
PrimeTek execute the PrimeUI change cleanly, and the ecosystem noticed: a
counter-project formed in response. In August 2026, a visible CLA on a _new_
Angular UI library reads as the founder preserving the option PrimeTek just
exercised.

**Recommendation: DCO (GitHub App or Action) + Apache-2.0 §5. No CLA at
launch.** It surrenders nothing the founder needs — §5 brings contributions in
under Apache-2.0 automatically and §3 supplies the patent grant a CLA would
add — while creating the audit trail, at one `git commit -s` of contributor
cost. It is also a costly, credible anti-relicensing signal.

**Trade-off accepted knowingly:** without a CLA, TEKAD cannot unilaterally
relicense contributed code later. If the founder genuinely wants that option,
the honest path is a CLA disclosed prominently from day one — **not a DCO now
and a CLA introduced later**, which is the move that destroys trust.

**LEGAL QUESTION:** can a future commercial tier be preserved without a full
CLA — e.g. by keeping commercial add-ons in a separate, solely-owned
repository so the open core never needs relicensing?

**LEGAL QUESTION:** is a public non-relicensing commitment enforceable as
promissory estoppel or as a licence term, and does enforceability differ under
Indian versus US law?
