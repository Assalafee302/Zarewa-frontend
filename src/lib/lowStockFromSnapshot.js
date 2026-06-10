/**
 * Low-stock SKU count from workspace bootstrap snapshot (not React inventory context).
 * @param {object | null | undefined} snapshot
 */
export function countLowStockFromSnapshot(snapshot) {
  const products = Array.isArray(snapshot?.products) ? snapshot.products : [];
  const examples = [];
  let count = 0;
  for (const p of products) {
    const stock = Number(p.stockLevel ?? p.stock_level);
    const threshold = Number(p.lowStockThreshold ?? p.low_stock_threshold);
    if (!Number.isFinite(stock) || !Number.isFinite(threshold) || threshold <= 0) continue;
    if (stock < threshold) {
      count += 1;
      if (examples.length < 3) examples.push(String(p.name || p.productID || p.product_id || 'SKU').trim());
    }
  }
  return { count, examples };
}
