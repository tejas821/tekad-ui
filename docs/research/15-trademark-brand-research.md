# Trademark & Brand — Preliminary Conflict Research

Research date 2026-08-27. **Not legal advice and NOT a clearance search.**
Risk classification only. Nothing here says the name is available or safe.

## Context that shapes everything below

**FACT:** TEKAD is a common Indonesian and Malay noun meaning
"determination / resolve / firm will." The field is therefore crowded — but,
importantly, crowded in sectors and geographies mostly adjacent to, not
overlapping with, developer tooling.

## npm

**FACT (queried 2026-08-27):** `registry.npmjs.org` returned **HTTP 404** for
`tekad`, `tekad-ui`, `tekadui`, `@tekad/core`, `@tekad/ui`, `@tekad-ui/core`.
Registry search for `text=tekad` returned `total: 0`. `npmjs.com/org/tekad`
returned HTTP 403 (bot protection) and could not be read.

**INTERPRETATION:** No published package exists under any of these names.
**Caveat: the public registry cannot distinguish "scope available" from "scope
reserved by a user with nothing published"** — npm reserves a scope matching
every username at signup. Definitive confirmation requires an authenticated
`npm org ls tekad`, or attempting `npm publish --access public` on a throwaway
`@tekad/probe`.

## GitHub

**FACT:** `github.com/tekad` **exists** — a User account, display name
`tekad`, no bio, "doesn't have any public repositories yet."
**FACT:** `github.com/tekad-ui` → 404. `github.com/tekadui` → 404.
**FACT:** GitHub's REST API was proxy-blocked and `github.com/search` is
robots-disallowed, so a repository-wide search **could not be performed**.

**INTERPRETATION:** This is the most actionable finding. The preferred org
name is occupied by a dormant account. GitHub's name-squatting policy permits
requesting release of inactive accounts, but empty personal accounts are often
not released. Note the correlation risk: the same person may hold both
`github.com/tekad` and the npm `@tekad` scope.

## Existing use of the name

**FACT — verified entities:**
- **TEKAD (Transformasi Ekonomi Kampung Terpadu)** — a major Indonesian
  Ministry of Villages programme, IFAD co-financed, running public web
  software at `tekad.kemendesa.go.id`, a recruitment portal, and a Play Store
  app (`com.kemendesa.elapkin`).
- **TEKAD COMMUNICATIONS (M) SDN. BHD.** — Selangor, Malaysia.
- **Akas Tekad Sdn Bhd**, **Tekad Industries Inc**, **Tekad Nusantara Sdn
  Bhd**, **Penerbit Tekad** (Indonesian publisher).
- **TEKADA** — a software company in Batam, Indonesia (`tekada.id`),
  self-described digital-transformation partner.

**INTERPRETATION:** Existing uses cluster in Indonesia/Malaysia and in
non-software sectors. Two touch software: the government programme (an
acronym for a programme, not a software product brand, in an entirely
different channel) and **TEKADA — one letter away, in IT services.** TEKADA is
the closest commercial-software neighbour found and warrants specific
attention in any professional search.

**No existing use as a developer tool, software library, framework or
component library was found anywhere.**

## Trademark registers — honest access report

| Register | Attempted | Outcome |
|---|---|---|
| **IP India** (tmrsearch.ipindia.gov.in) | Yes | **BLOCKED** — CAPTCHA-gated, JS-required. No query submitted, no results. |
| **USPTO** (tmsearch.uspto.gov + API) | Yes | **BLOCKED** — HTTP 000 via proxy; documented API path 404. No authoritative query. |
| **EUIPO / TMview** | Yes | **BLOCKED** — HTTP 000; UI robots-disallowed. |
| **WIPO Global Brand DB** | Yes | **BLOCKED** — JS-only application. |
| Justia (unofficial US mirror) | Yes | **Succeeded.** 6 results, **all prefix/near matches, no exact TEKAD**: TEKADENCE, TEKADVISE, TEKADEMICS, TEKADEMY, TEKADVISERS, TEK-AD. |
| Trademarkia (unofficial mirror) | Yes | **Succeeded.** "0 Trademark Results found for 'tekad'." |

**INTERPRETATION:** Two independent unofficial US mirrors returned no exact
mark. That is a **weak positive signal for the United States only**. It is not
a clearance search — mirrors lag, cover pending applications inconsistently,
and perform no phonetic or similarity analysis. **The two jurisdictions that
matter most — India (founder's base) and Indonesia/Malaysia (where the word is
common and at least six entities already trade under it) — could not be
searched at all.** The probability of a registered TEKAD mark in ID/MY
registries is materially non-trivial, most likely in unrelated Nice classes.

## Domains

**FACT (A-record resolution 2026-08-27; RDAP was proxy-blocked, so no
registration status is authoritative):**

| Domain | A record |
|---|---|
| `tekad.dev`, `tekad.io`, `tekad.net`, `tekadui.dev` | **none** |
| `tekad.com` | 199.168.103.236 |
| `tekad.org` | 104.21.93.37 (Cloudflare) |
| `tekad.id` | 172.67.137.15 (Cloudflare) |
| `tekad.co.id` | 103.253.215.19 |

**INTERPRETATION:** "No A record" is consistent with unregistered but does not
prove it. The pattern suggests Indonesian/Malaysian entities hold the
commercial and regional TLDs while developer-oriented TLDs are free.
`tekad.dev` and `tekadui.dev` are the natural targets; `.dev` also enforces
HSTS preloading. The `.com` is the meaningful loss.

## Namespace recommendation

**`@tekad/*`, contingent on one verification step.**

It matches the ecosystem convention where the scope is the *project* and the
package is the *module* (`@angular/core`, `@taiga-ui/core`,
`@spartan-ng/brain`). `@tekad-ui/core` reads "TEKAD UI core" — stuttering the
category — and forecloses non-UI expansion (a CLI, an ESLint plugin, a
schematics collection) that `@tekad/*` accommodates naturally.

**Contingency:** the scope may be *reserved* by the existing npm user, exactly
as `github.com/tekad` already is. Run `npm org ls tekad` authenticated, or
attempt a throwaway publish, before committing. If unavailable, prefer
`@tekad-ui/*` — verified free, and `github.com/tekad-ui` and `tekadui.dev` are
also free, giving a consistent triple — over workaround forms like `@tekadjs`
or `@usetekad`.

## Risk classification

| Surface | Classification |
|---|---|
| **npm** | **LOWER APPARENT CONFLICT** — zero published packages; scope *reservation* not publicly detectable. |
| **GitHub** | **POTENTIAL CONFLICT** — `github.com/tekad` occupied by a dormant user; repo-wide search could not be performed. |
| **Existing software use** | **POTENTIAL CONFLICT** — no developer-tool use found, but an active government programme runs public web software under the name and TEKADA is one letter away in IT services. |
| **Trademark** | **REQUIRES PROFESSIONAL SEARCH** — every official register was inaccessible; India and Indonesia/Malaysia not searched at all. |
| **Domains** | **POTENTIAL CONFLICT** — `.dev`/`.io`/`.net` appear free; `.com`/`.org`/`.id`/`.co.id` resolve to live hosts. RDAP blocked. |

## Attorney question list

**Trademark**
1. Full clearance for TEKAD in **India (IP India)**, classes 9 and 42, and in
   **Indonesia (DJKI)** and **Malaysia (MyIPO)**, including phonetic and
   visually similar marks.
2. Is TEKAD registrable in India given it is a common Bahasa Indonesia/Malay
   word? Does the doctrine of foreign equivalents raise a descriptiveness or
   laudatory objection in any target jurisdiction?
3. Do TEKAD Communications (M) Sdn Bhd, Tekad Nusantara, Akas Tekad, Tekad
   Industries or Penerbit Tekad hold registered marks, in which classes, and
   does any create a bar or opposition risk in class 9/42?
4. Does **TEKADA** (`tekada.id`) hold a registered mark — does one-letter
   proximity in an overlapping software field create confusion risk?
5. Does the Indonesian Ministry of Villages' TEKAD programme hold any mark or
   official-emblem protection restricting a private class 9/42 registration?
6. Minimum viable filing strategy for a globally distributed free developer
   tool — India first, then Madrid Protocol? Which jurisdictions matter?
7. Risk of *using* TEKAD unregistered while filing is pending; what does
   prior-use evidence require in India?

**Licensing / IP**
8. Review a draft `TRADEMARK.md` — does an Apache-2.0 §6-based name policy
   strengthen the position, or does it depend entirely on registration?
9. Is a public non-relicensing commitment enforceable under Indian law?
10. Is DCO sign-off adequate contributor provenance under Indian law, or would
    an acquirer/investor expect a CLA?
11. Indian employment / IP-assignment issues if the founder is employed
    elsewhere while building TEKAD.
12. Should TEKAD be held personally or through an entity — does that change
    the trademark applicant?

**Verification still owed (not attorney work)**
13. `npm org ls tekad` authenticated, to settle scope availability.
14. Authoritative WHOIS/RDAP on `tekad.dev`, `tekad.io`, `tekadui.dev` from an
    unproxied connection.
15. Re-run all four official registers from a browser session capable of
    CAPTCHA and JavaScript.

---

> Based on the sources reviewed, these risks appear lower/higher, but formal
> trademark and IP clearance should be obtained from a qualified attorney
> before commercial launch or registration.
