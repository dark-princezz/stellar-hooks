import type { Config } from 'tailwindcss';

export const stellarHooksTailwindPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        'sh-bg': 'var(--sh-bg, #0b1020)',
        'sh-fg': 'var(--sh-fg, #f5f7ff)',
        'sh-muted': 'var(--sh-muted, #94a3b8)',
        'sh-primary': 'var(--sh-primary, #7c3aed)',
        'sh-primary-fg': 'var(--sh-primary-fg, #ffffff)',
        'sh-border': 'var(--sh-border, #334155)',
        'sh-danger': 'var(--sh-danger, #ef4444)',
      },
      borderRadius: {
        'sh': 'var(--sh-radius, 0.75rem)',
      },
    },
  },
};

export default stellarHooksTailwindPreset;
