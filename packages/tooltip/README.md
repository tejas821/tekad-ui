# @tekad/tooltip

TEKAD tooltip — a brief label shown on hover/focus.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/tooltip)

## Install

```bash
npm install @tekad/tooltip @tekad/core @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadTooltip } from '@tekad/tooltip';

@Component({
  imports: [TekadTooltip],
  template: ` <tk-tooltip position="top">Copies the link</tk-tooltip> `,
})
export class Example {}
```

Input: `position` (`top` | `bottom` | `left` | `right`).

## License

Apache-2.0 © Tejas Kadam
