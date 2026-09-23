# @tekad/checkbox

TEKAD checkbox. Implements Angular's FormCheckboxControl; Reactive Forms support lives in @tekad/forms/compat.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/checkbox)

## Install

```bash
npm install @tekad/checkbox @tekad/core @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadCheckbox } from '@tekad/checkbox';

@Component({
  imports: [TekadCheckbox],
  template: ` <tk-checkbox [(checked)]="accepted">I agree</tk-checkbox> `,
})
export class Example {}
```

A real `<input type="checkbox">` inside; implements Angular's `FormCheckboxControl`. Reactive Forms support: `@tekad/forms/compat`.

## License

Apache-2.0 © Tejas Kadam
