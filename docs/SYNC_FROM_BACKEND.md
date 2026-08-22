# Sync `src/shared/` with the backend repo

The SPA copies isomorphic modules from backend **`shared/`** so this package stays standalone in a two-repo setup. **Backend is the source of truth.**

```
cd Zarewa-frontend-main
npm run sync:shared    # copy
npm run verify:shared  # CI: fail if drifted
```

The pair list lives in `scripts/shared-sync-pairs.mjs`. `src/lib/<name>.js` for those modules is a re-export stub — edit `src/shared/lib/` (or the backend file, then sync).

Do not add a second copy of ledger/PO/payment math in `src/lib`.
