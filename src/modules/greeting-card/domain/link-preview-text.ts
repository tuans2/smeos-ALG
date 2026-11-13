/** Tiêu đề + mô tả hiện dưới ảnh xem trước khi gửi link bộ sưu tập qua Zalo/Messenger. */
export function linkPreviewText(input: {
  catalogName: string
  shopName: string | null
  /** Mô tả tiệm tự viết cho bộ sưu tập — ưu tiên giữ nguyên */
  catalogDescription: string | null
  prices: Array<number | null>
}): { title: string; description: string } {
  const title = input.shopName ? `${input.catalogName} · ${input.shopName}` : input.catalogName
  const known = input.prices.filter((p): p is number => typeof p === "number" && p > 0)
  const fromPrice = known.length ? `, giá từ ${Math.min(...known).toLocaleString("vi-VN")}đ` : ""
  const description =
    input.catalogDescription?.trim() || `${input.prices.length} sản phẩm${fromPrice}. Chạm để xem và đặt hàng.`
  return { title, description }
}
