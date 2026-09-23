# @tekad/divider

TEKAD divider — a visual separator.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/divider)

## Install

```bash
npm install @tekad/divider @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadDivider } from '@tekad/divider';

@Component({
  imports: [TekadDivider],
  template: ` <tk-divider orientation="horizontal" /> `,
})
export class Example {}
```

Input: `orientation`.

## License

Apache-2.0 © Tejas Kadam
