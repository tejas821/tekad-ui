# @tekad/progress

TEKAD progress — a determinate or indeterminate progress bar.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/progress)

## Install

```bash
npm install @tekad/progress @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadProgress } from '@tekad/progress';

@Component({
  imports: [TekadProgress],
  template: `
    <tk-progress [value]="40" [max]="100" ariaLabel="Upload" />
    <tk-progress ariaLabel="Loading" />
    <!-- indeterminate -->
  `,
})
export class Example {}
```

`value = null` renders an indeterminate bar.

## License

Apache-2.0 © Tejas Kadam
