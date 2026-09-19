# Public API Rules

Every exported symbol carries one of three classifications.

| Class          | Contract                                              | Change policy                                       |
| -------------- | ----------------------------------------------------- | --------------------------------------------------- |
| `PUBLIC`       | Documented, tested, accessible, SSR-safe, stable name | Breaking change requires an ADR + deprecation cycle |
| `INTERNAL`     | Not exported from the package entry point             | Changes freely                                      |
| `EXPERIMENTAL` | Exported, clearly marked, documented as unstable      | May change in any release                           |

Mark experimental APIs in source and in docs. An unmarked export is public.

## Design rules

- Prefer composition, typed configuration, content projection, directives and
  DI providers over long boolean input lists.
- Avoid boolean-flag explosion. If a component accumulates more than a handful
  of independent booleans, the shape is wrong — split it into composable parts.
- Names describe intent, not implementation.
- Types are precise. `any` in a public signature is a review blocker.
- Signal inputs/outputs/models are the default input mechanism.
- Errors are explicit and developer-legible. Never swallow an error to make a
  demo pass. Never weaken a type to silence the compiler.

## Anti-pattern (do not do this)

```html
<tk-table
  showHeader
  showFooter
  enableSelection
  enableFilter
  enableSort
  enableVirtualScroll
  compact
  dense
  bordered
  stickyHeader
></tk-table>
```

## Direction

```html
<tk-table>
  <tk-table-toolbar />
  <tk-table-column />
  <tk-table-footer />
</tk-table>
```

The exact API is designed independently per component. Do not reproduce
another library's distinctive API for convenience — see ADR-006 and the
clean-room rules in `CLAUDE.md` §2.10.

## Breaking a public API

1. Confirm it is actually necessary.
2. Find every internal consumer, doc and example.
3. Assess migration cost.
4. Record an ADR.
5. Deprecate before removing where possible.
6. Update the changelog.
