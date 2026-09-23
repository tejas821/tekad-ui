# @tekad/button

TEKAD button. Depends on the foundation; nothing depends on it.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/button)

## Install

```bash
npm install @tekad/button @tekad/core @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadButton } from '@tekad/button';

@Component({
  imports: [TekadButton],
  template: ` <button tkButton appearance="filled">Save</button> `,
})
export class Example {}
```

Decorates a native `<button>`. Inputs: `appearance`, `type`.

## License

Apache-2.0 © Tejas Kadam
