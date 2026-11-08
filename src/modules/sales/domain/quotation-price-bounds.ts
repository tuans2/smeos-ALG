/**
 * Tiền đem so với giá TRẦN của báo giá (PO 07/11/2026, Q3): tiền hàng sau giảm trừ đi các dòng tự do (không có sản
 * phẩm, không có giá vốn nên không có trần). Không còn dòng sản phẩm nào → `null` (bỏ qua trần). Thuần.
 */
export function productLinesCeilingBase(
  items: ReadonlyArray<{ productId?: string | null | undefined; qty: number; unitPrice: number }>,
  goodsTotalVnd: number,
): number | null {
  if (!items.some((it) => it.productId)) return null
  const freeLines = items.filter((it) => !it.productId).reduce((sum, it) => sum + Math.max(1, Math.floor(it.qty)) * it.unitPrice, 0)
  return Math.max(0, goodsTotalVnd - freeLines)
}
