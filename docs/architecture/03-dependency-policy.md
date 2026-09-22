# Dependency Policy

No dependency enters casually. A dependency is a permanent maintenance,
security and bundle liability.

## Admission checklist

A dependency may be added only when every line is answered in writing in the PR:

1. Does Angular or the web platform already solve this? (If yes — stop.)
2. Does an existing TEKAD abstraction solve it, or could it, cheaply?
3. Maintenance health: recent releases, open-issue trend, bus factor.
4. Known vulnerabilities.
5. License — exact package and version, not a blog post. Copyleft? NOTICE?
6. Bundle cost, measured.
7. Runtime cost, measured where it matters.
8. Should it be a `peerDependency` or an _optional_ peer instead?
9. Does it create architectural coupling or a cycle?
10. What is the exit plan if it is abandoned?

## Classification

| Class         | Meaning                                  | Examples                                                                                   |
| ------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| Core runtime  | Shipped to every consumer of the package | keep as close to zero as possible                                                          |
| Peer          | Provided by the app                      | `@angular/core`, `@angular/common`, `rxjs`                                                 |
| Optional peer | Only for a specific integration          | charting libraries                                                                         |
| Dev           | Build/test only                          | never reaches consumers                                                                    |
| **Forbidden** | Never                                    | anything that would make a chart engine, rich-text engine or icon corpus a core dependency |

## Standing rules

- Core TEKAD packages install **no** charting library. Ever. (ADR-008)
- Icons are independently consumable; no massive icon corpus is bundled into
  components. Licences of any icon source are recorded.
- Lockfile is committed and respected. Dependency changes are reviewed as
  deliberately as source changes.
- Never introduce unsafe HTML rendering, `bypassSecurityTrust*` or dynamic
  script evaluation without an ADR justifying it.
- URL and HTML handling is sanitised through Angular's sanitiser by default.

## Under evaluation (blocked on research)

`@angular/cdk`, `@angular/aria`, date libraries, masking libraries, virtual
scrolling. Each needs a documented build / reuse / wrap / defer verdict — see
`19-build-buy-compose-defer-matrix.md` in the research output set and ADR-005,
ADR-010.
