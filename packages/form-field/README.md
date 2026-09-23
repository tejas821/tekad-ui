# @tekad/form-field

TEKAD form field. Wires label, hint and error text to the control inside it by ARIA IDREF.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/form-field)

## Install

```bash
npm install @tekad/form-field @tekad/core @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadFormField, TekadFieldHint, TekadFieldError } from '@tekad/form-field';

@Component({
  imports: [TekadFormField, TekadFieldHint, TekadFieldError],
  template: `
    <tk-form-field label="Email">
      <input tkInput type="email" />
      <tk-field-hint>We never share it.</tk-field-hint>
      <tk-field-error>Enter a valid email.</tk-field-error>
    </tk-form-field>
  `,
})
export class Example {}
```

Wires label, hint and error text to the control inside it by ARIA IDREF.

## License

Apache-2.0 © Tejas Kadam
