# shadcn/ui registry entry

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

Package connect button and address display components for installation via shadcn CLI.

## Registry item (example)

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "stellar-connect-button",
  "type": "registry:component",
  "dependencies": ["stellar-hooks", "@stellar/stellar-sdk"],
  "files": [
    { "path": "registry/stellar/connect-button.tsx", "type": "registry:component" },
    { "path": "registry/stellar/address-display.tsx", "type": "registry:component" }
  ]
}
```

## Usage

```bash
npx shadcn@latest add https://raw.githubusercontent.com/dark-princezz/stellar-hooks/main/registry/stellar-connect-button.json
```

After install, components are local source files and can be styled with your project theme.
