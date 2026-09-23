# @tekad/icon

TEKAD icon — an inline SVG with design-token sizing.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/icon)

## Install

```bash
npm install @tekad/icon @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadIcon } from '@tekad/icon';

@Component({
  imports: [TekadIcon],
  template: `
    <tk-icon size="1.25em" ariaLabel="Search">
      <svg viewBox="0 0 24 24"><!-- your path --></svg>
    </tk-icon>
  `,
})
export class Example {}
```

Inputs: `size`, `ariaLabel`, `ariaHidden`.

## License

Apache-2.0 © Tejas Kadam
