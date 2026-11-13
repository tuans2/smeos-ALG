import { getCategoryVariants } from "@/lib/product-filter"

/**
 * Loại hoa (khớp cả biến thể tên và dáng) VÀ từ khoá — mỗi nhóm là một `OR`, gộp bằng `AND` để
 * nhóm sau không ghi đè nhóm trước (soát 14/10/2026: lọc loại + tìm từ khoá từng bỏ mất bộ lọc loại).
 */
export function categoryAndSearchWhere(filters: { category?: string | undefined; search?: string | undefined; ids?: readonly string[] | undefined }) {
  const groups: Array<{ OR: object[] }> = []
  // Chọn đúng danh sách sản phẩm (vd. đăng lên kênh bán — Trung tâm Tích hợp GĐ4), tối đa 100 id.
  if (filters.ids) groups.push({ OR: [{ id: { in: filters.ids.slice(0, 100) } }] })
  const category = filters.category?.trim()
  if (category) {
    const variants = getCategoryVariants(category)
    groups.push({
      OR: [
        { category: { equals: category, mode: "insensitive" as const } },
        { category: { in: variants, mode: "insensitive" as const } },
        { shape: { equals: category, mode: "insensitive" as const } },
        { shape: { in: variants, mode: "insensitive" as const } },
      ],
    })
  }
  if (filters.search) {
    groups.push({
      OR: [
        { name: { contains: filters.search, mode: "insensitive" as const } },
        { code: { contains: filters.search, mode: "insensitive" as const } },
      ],
    })
  }
  return groups.length > 0 ? { AND: groups } : {}
}
