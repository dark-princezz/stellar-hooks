---
"stellar-hooks": patch
---

perf: reduce `useSorobanContract` consumer bundle size by importing Soroban primitives from the lean `@stellar/stellar-sdk/minimal` subpath instead of the root barrel (drops Horizon/SEP/axios/eventsource surface that CJS consumers cannot tree-shake)
