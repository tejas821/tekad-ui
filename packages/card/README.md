# @tekad/card

TEKAD card — a content container with optional header and footer.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/card)

## Install

```bash
npm install @tekad/card @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadCard } from '@tekad/card';

@Component({
  imports: [TekadCard],
  template: `
    <tk-card>
      <h3 tkCardHeader>Title</h3>
      <p>Card content</p>
      <div tkCardFooter>Footer</div>
    </tk-card>
  `,
})
export class Example {}
```

Project content into the `tkCardHeader` and `tkCardFooter` slots; everything else goes into the body.

## License

Apache-2.0 © Tejas Kadam
