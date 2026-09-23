# @tekad/dialog

TEKAD dialog. A native <dialog> driven by @tekad/overlay's deferred-close primitive.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/dialog)

## Install

```bash
npm install @tekad/dialog @tekad/core @tekad/overlay @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadDialog } from '@tekad/dialog';

@Component({
  imports: [TekadDialog],
  template: `
    <tk-dialog heading="Delete file?" (closed)="onClosed()">
      <p>This cannot be undone.</p>
    </tk-dialog>
  `,
})
export class Example {}
```

Built on the native `<dialog>` element and `showModal()`. Inputs: `heading`; output: `closed`.

## License

Apache-2.0 © Tejas Kadam
