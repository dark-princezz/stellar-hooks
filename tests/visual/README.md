# Visual regression tests

Screenshots of the UI components (every story under `Components/` in Storybook), compared on each pull request so
styling changes are reviewed deliberately (#1201).

```bash
npx storybook build
npm run test:visual            # compare with the committed baselines
npm run test:visual:update     # rewrite baselines after an intended styling change
```

Baselines live in `tests/visual/__screenshots__/` and are committed.

**Generate and update baselines in CI**, not locally: run the *Visual regression* workflow with `update` set to
`true`, download the `visual-baselines` artifact, and commit it. Screenshots rendered on macOS or Windows differ
in font rendering and will fail on Linux.

Review a change: when the check fails, download the `visual-report` artifact; it has the expected, actual and
diff image for every changed story. If the change is intended, update the baselines in the same pull request.

Add a component to the suite by adding a story with a `Components/...` title.
