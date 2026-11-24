# Translation workflow

Community translations of the README and the getting-started guide are managed
with [Crowdin](https://crowdin.com) (free for open source). Crowdin was chosen over
alternatives (Weblate, Transifex) because it has a GitHub integration that opens
translation PRs automatically and handles Markdown without custom tooling.

## How it works

1. Source files (English) are listed in [`crowdin.yml`](../crowdin.yml).
2. Translators work in the Crowdin project; strings are never edited by hand in the repo.
3. Crowdin opens a PR on a `l10n_main` branch with files at
   `docs/i18n/<locale>/...` (e.g. `docs/i18n/es/README.md`).
4. A maintainer reviews and merges. Untranslated strings fall back to English.

## Maintainer setup (not done in this PR)

- Create the Crowdin project and connect it to the repository.
- Add `CROWDIN_PROJECT_ID` and `CROWDIN_PERSONAL_TOKEN` as repository secrets.
- Optionally add a workflow using `crowdin/github-action` to sync on push to `main`.

## Contributing translations

Join the Crowdin project, pick a language and translate. Keep code blocks, API
names and hook names untranslated.
