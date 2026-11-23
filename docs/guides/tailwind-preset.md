# Tailwind preset for optional UI components

Use the preset to map stellar-hooks CSS variables to Tailwind theme values.

```js
// tailwind.config.js
import { stellarHooksTailwindPreset } from 'stellar-hooks/styles/tailwind-preset';

export default {
  presets: [stellarHooksTailwindPreset],
  content: ['./src/**/*.{ts,tsx,astro,html}'],
};
```

Then use classes like `bg-sh-bg`, `text-sh-fg`, `bg-sh-primary`, `rounded-sh`.
