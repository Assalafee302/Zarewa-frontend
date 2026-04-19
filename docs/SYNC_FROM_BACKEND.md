# Sync `src/shared/` with the backend repo

The SPA duplicates a small slice of the backend **`shared/`** tree so this package stays standalone when you use two Git repositories.

| Frontend file | Canonical backend file |
|----------------|-------------------------|
| `src/shared/expenseCategories.js` | `shared/expenseCategories.js` |
| `src/shared/refundConstants.js` | `shared/refundConstants.js` |

Before each release, diff these pairs and copy changes from **backend** into **frontend** so selects, validation, and refund categories stay aligned.
