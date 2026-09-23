# @tekad/input

TEKAD text input. Decorates a native <input>; implements Angular's FormValueControl.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/input)

## Install

```bash
npm install @tekad/input @tekad/core @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadInput } from '@tekad/input';

@Component({
  imports: [TekadInput],
  template: `
    <input tkInput placeholder="Your name" />
    <textarea tkInput></textarea>
  `,
})
export class Example {}
```

Decorates a native `<input>`/`<textarea>`; implements Angular's `FormValueControl`. Inputs: `disabled`, `readonly`, `required`, `invalid`.

## License

Apache-2.0 © Tejas Kadam
