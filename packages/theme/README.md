# @tekad/theme

TEKAD design tokens and theme. The shipped artefact is styles/tekad.css; the TypeScript surface is two symbols.

Part of [TEKAD UI](https://tejas821.github.io/tekad-ui/) — an Angular 22, standalone-only, signals-first component library. [Guide](https://tejas821.github.io/tekad-ui/) · [Source](https://github.com/tejas821/tekad-ui/tree/main/packages/theme)

## Install

```bash
npm install @tekad/theme
```

Requires Angular `^22.1.0`.

## Usage

Design tokens and the TEKAD theme stylesheet.

```css
/* styles.css */
@import '@tekad/theme/styles/tekad.css';
```

Or in `angular.json`: `"styles": ["node_modules/@tekad/theme/styles/tekad.css", "src/styles.css"]`.

Raw tokens: `@tekad/theme/tokens.json`.

## License

Apache-2.0 © Tejas Kadam
