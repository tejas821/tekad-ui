# @tekad/table

TEKAD table — a semantic table foundation.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/table)

## Install

```bash
npm install @tekad/table @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Load the theme once (e.g. in `styles.css`):

```css
@import '@tekad/theme/styles/tekad.css';
```

```ts
import { TekadTable } from '@tekad/table';

@Component({
  imports: [TekadTable],
  template: `
    <table tkTable [striped]="true">
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Asha</td>
          <td>Admin</td>
        </tr>
      </tbody>
    </table>
  `,
})
export class Example {}
```

Decorates a semantic `<table>`. Inputs: `striped`, `bordered`, `compact`.

## License

Apache-2.0 © Tejas Kadam
