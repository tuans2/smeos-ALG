/**
 * Số mục đang chờ duyệt — cùng nguồn với màn `/duyet` (phân tích ảnh + ảnh tối ưu đang chờ duyệt).
 *
 * Audit hành trình K2 (gói UJ-07): "Trung tâm tăng trưởng" từng đếm job có `stage = NEEDS_APPROVAL` — worker không
 * bao giờ ghi giá trị đó nên luôn 0; bảng điều hành đếm với `limit=1` nên tối đa 2. Đếm tới `PAGE` mỗi nguồn
 * (đủ cho thẻ "việc cần làm"; trang `/duyet` mới là danh sách đầy đủ).
 */
const PAGE = 100
const SOURCES = [`/api/v1/vision/analyses?limit=${PAGE}`, `/api/v1/media/optimizations?limit=${PAGE}`] as const

type Fetcher = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

/** `null` khi không đọc được nguồn nào (vd. vai không có quyền duyệt) — thẻ ẩn số thay vì hiện 0 sai. */
export async function fetchPendingApprovalCount(get: Fetcher = (url) => fetch(url, { cache: "no-store" })): Promise<number | null> {
  const counts = await Promise.all(
    SOURCES.map(async (url) => {
      try {
        const res = await get(url)
        if (!res.ok) return null
        const body = (await res.json()) as { data?: unknown }
        return Array.isArray(body?.data) ? body.data.length : null
      } catch {
        return null
      }
    })
  )
  const known = counts.filter((n): n is number => n !== null)
  return known.length === 0 ? null : known.reduce((a, b) => a + b, 0)
}
