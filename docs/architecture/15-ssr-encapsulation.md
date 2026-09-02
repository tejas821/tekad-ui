# SSR Encapsulation Cost (Phase 9 precondition)

ADR-007 ends with an obligation rather than a decision:

> Emulated-encapsulation SSR cost must be measured before Phase 9 (a 1,000-row
> table pays one `_ngcontent` attribute per element).

This is that measurement. It was taken before any component was written,
because the answer sets `encapsulation` for everything TEKAD will ever ship and
that is expensive to reverse.

The parenthesis is exactly right. The conclusion nearly everyone draws from it
is wrong.

## What was measured

A 1,000 × 8 table — 8,000 cells, ~9,000 elements — rendered three ways through
`renderApplication`, AOT-compiled in **full** mode so the output is what a
consumer's application produces.

| shape      | what differs                        |
| ---------- | ----------------------------------- |
| `none`     | `ViewEncapsulation.None`            |
| `emulated` | the default — identical markup      |
| `per-cell` | emulated, plus a component per cell |

`none` and `emulated` share a template, styles and data. The only difference
between them is the encapsulation setting, so the difference between their
outputs is the attribute cost and nothing else.

## The result

| shape      | raw       | gzip    | brotli  | `_ngcontent` | `_nghost` |
| ---------- | --------- | ------- | ------- | ------------ | --------- |
| `none`     | 280.9 KB  | 22.1 KB | 8.1 KB  | 0            | 0         |
| `emulated` | 527.1 KB  | 21.0 KB | 9.0 KB  | 9,005        | 1         |
| `per-cell` | 1606.3 KB | 25.9 KB | 12.3 KB | 25,006       | 8,001     |

Overhead over `ViewEncapsulation.None`:

| shape      | raw     | gzip      | brotli |
| ---------- | ------- | --------- | ------ |
| `emulated` | +87.7%  | **−4.8%** | +10.8% |
| `per-cell` | +471.9% | +17.4%    | +51.0% |

**Emulated encapsulation adds 246 KB of raw HTML and, after gzip, the document
is smaller than the unencapsulated one.**

That is not a measurement error. `_ngcontent-ng-c488987220=""` is the same 27
bytes on all 9,005 occurrences — the easiest input a compressor will ever see.
It lengthens the repeated unit being back-referenced and pays for itself. Under
brotli it costs 0.9 KB on an 8.1 KB document.

## The cost is the component, not the attribute

`per-cell` differs from `emulated` by one decision: a `<tk-cell>` component per
cell instead of one component for the table. That is +1.1 MB raw, +17.4% gzip,
**+51% brotli**, and 2.8× the elements.

The two get conflated because they usually arrive together — you reach for a
cell component and inherit its encapsulation attributes at the same time. They
are separable, and only one of them is expensive.

**This is the number ADR-014 needs.** The table is the flagship and the hardest
architectural test in the roadmap, and its size lever is component granularity,
not view encapsulation. A cell must not be a component by default.

## Parse cost: measured, and it says nothing

Compression answers "what is downloaded". It does not answer "what must then be
parsed", and raw size is the input to that — the bytes are decompressed before
anything reads them. That was the one remaining argument for caring, so it was
measured in Chromium rather than argued about.

| shape      | median parse | spread  | elements | attributes |
| ---------- | ------------ | ------- | -------- | ---------- |
| `none`     | 188.1 ms     | ±202 ms | 9,008    | 9,004      |
| `emulated` | 186.0 ms     | ±163 ms | 9,008    | 18,007     |
| `per-cell` | 448.5 ms     | ±331 ms | 25,009   | 50,008     |

**No conclusion may be drawn from these medians.** `none` and `emulated` are
2 ms apart against 202 ms of noise. Even `emulated` versus `per-cell` — 263 ms
apart, 331 ms of noise — does not separate.

An earlier run appeared to show emulated parsing _faster_, which would have been
a striking finding. It was noise, and the only reason that did not get written
down is that the gate prints the spread beside the median and compares the two.

This stays **UNVERIFIED**, consistent with ADR-011: size is the hard gate,
runtime performance is tracked and non-blocking, because runner variance is too
large. The exact numbers in that table are the element and attribute counts.

## The decision

**`ViewEncapsulation.Emulated` — Angular's default — for every TEKAD
component.** Not by inertia; by measurement.

- Its transfer cost is nil. That was the entire case against it.
- `ViewEncapsulation.None` would make every TEKAD class name a global name a
  consumer can collide with, and one TEKAD can never narrow afterwards without
  a breaking change. That is a permanent API commitment bought with a saving
  that does not exist after compression.
- `ViewEncapsulation.ShadowDom` stays banned by ADR-007 decision 8, and the
  reason is not stylistic: ARIA IDREF attributes — `aria-labelledby`,
  `aria-describedby`, `aria-activedescendant`, `aria-controls` — do not cross a
  shadow boundary. They do not error. They resolve to nothing, and the widget
  renders looking correct and unlabelled. A single component opting in breaks
  every composite widget it participates in, so it cannot be a local choice.

## The gate

`tools/verify-ssr-encapsulation.mjs` runs the measurement every build and holds
the compressed overheads to budgets set **from the measured values**, not from
aspirations — a budget nothing is near never fires.

It also asserts the probe is still measuring something. A probe that stopped
emitting scoping attributes would report a wonderfully flattering result and
prove nothing, so `emulated` must show more than one attribute per element and
`none` must show zero.

The ShadowDom ban is enforced in the same gate, against `packages/**`. It was
enforced by nothing before, which for a rule the whole accessibility model rests
on is the wrong number.

`tools/lib/ssr-size.test.mjs` is the gate's own self-test. The case worth
reading asserts that overhead is reported **on top of the baseline** rather than
as a reduction from the subject: 280.9 KB → 527.1 KB is +88% and −47%
describing the same two files, and only the first answers "what does this cost
me". A gate quoting the flattering direction would pass forever while saying
the opposite of the truth.

## What this changes

- ADR-007 gets a dated correction. The obligation is discharged; the assumption
  behind it did not survive.
- ADR-014 (table) inherits a hard constraint: **a cell is not a component.**
- Phase 9 components use the default encapsulation and say nothing about it.
