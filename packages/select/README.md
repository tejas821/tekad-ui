# @tekad/select

TEKAD select — a select control with native fallback.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/select)

## Install

```bash
npm install @tekad/select @tekad/core @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadSelect, TekadOption } from '@tekad/select';

@Component({
  imports: [TekadSelect, TekadOption],
  template: `
    <tk-select [(value)]="country">
      <tk-option value="in">India</tk-option>
      <tk-option value="us">United States</tk-option>
    </tk-select>
  `,
})
export class Example {}
```

Inputs: `value`, `disabled`, `invalid`.

## License

Apache-2.0 © Tejas Kadam
