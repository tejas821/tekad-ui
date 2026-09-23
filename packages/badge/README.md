# @tekad/badge

TEKAD badge — a small count or status indicator.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/badge)

## Install

```bash
npm install @tekad/badge @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadBadge } from '@tekad/badge';

@Component({
  imports: [TekadBadge],
  template: ` <tk-badge tone="success">New</tk-badge> `,
})
export class Example {}
```

Inputs: `tone`, `dot`.

## License

Apache-2.0 © Tejas Kadam
