# @tekad/tabs

TEKAD tabs — a tabbed interface with keyboard navigation.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/tabs)

## Install

```bash
npm install @tekad/tabs @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadTabGroup, TekadTab } from '@tekad/tabs';

@Component({
  imports: [TekadTabGroup, TekadTab],
  template: `
    <tk-tab-group>
      <tk-tab label="Overview">…</tk-tab>
      <tk-tab label="Settings">…</tk-tab>
    </tk-tab-group>
  `,
})
export class Example {}
```

Arrow keys, Home and End move between tabs; disabled tabs are skipped.

## License

Apache-2.0 © Tejas Kadam
