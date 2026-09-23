# @tekad/switch

TEKAD switch — a toggle with a native checkbox inside.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/switch)

## Install

```bash
npm install @tekad/switch @tekad/core @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadSwitch } from '@tekad/switch';

@Component({
  imports: [TekadSwitch],
  template: ` <tk-switch [(checked)]="darkMode">Dark mode</tk-switch> `,
})
export class Example {}
```

A toggle with a native checkbox inside. Input: `disabled`.

## License

Apache-2.0 © Tejas Kadam
