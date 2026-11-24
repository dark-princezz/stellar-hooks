# stellar-hooks minimal reproduction

A tiny Vite + React + TypeScript app for bug reports. It contains only a provider, a wallet connection, and one account read, so a maintainer can run it without understanding your application.

## Use it in an issue

1. Fork [dark-princezz/stellar-hooks](https://github.com/dark-princezz/stellar-hooks), or create a new repository from this directory.
2. Run `npm install` and `npm run dev`.
3. Change **only** `src/App.tsx` so that it demonstrates the broken hook or wallet interaction.
4. Include the versions from your `package.json`, the exact steps, and the URL of your fork in the [bug report](https://github.com/dark-princezz/stellar-hooks/issues/new?template=bug_report.yml).

Keeping the reproduction minimal makes it much easier to tell a library bug from an application configuration issue.

## Scripts

- `npm run dev` — start the app
- `npm run build` — type-check and build
- `npm run lint` — lint the source
