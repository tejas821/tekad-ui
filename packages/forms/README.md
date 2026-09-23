# @tekad/forms

TEKAD forms integration. The primary entry point is documentation only; the Reactive Forms adapter is @tekad/forms/compat.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/forms)

## Install

```bash
npm install @tekad/forms @tekad/core
```

Requires Angular `^22.1.0`.

## Usage

Forms integration. The primary entry point is documentation only; the Reactive Forms adapter lives in `@tekad/forms/compat`:

```ts
import { TekadCompatAdapter } from '@tekad/forms/compat';

// template
<tk-checkbox tkCompat [formControl]="acceptedTerms">I accept</tk-checkbox>
```

Add the `tkCompat` directive next to a TEKAD control to bind it with `formControlName` / `[formControl]`.

## License

Apache-2.0 © Tejas Kadam
