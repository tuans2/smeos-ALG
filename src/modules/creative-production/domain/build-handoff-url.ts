/**
 * Domain: Build Handoff URL — Dựng query string bàn giao Chặng 05 CHOOSE → Creative Studio.
 *
 * Sự cố gốc (22/09/2026): `CreativeHandoffModal` từng nhét nguyên ảnh (Data URL
 * base64, có thể dài ~200.000 ký tự) vào `imageUrl` của query string rồi gọi
 * `router.push`. Node giới hạn tổng độ dài header ~16KB — `router.push` âm
 * thầm thất bại (App Router nhận `431 Request Header Fields Too Large` từ
 * request RSC, không phải lỗi JS nào bắt được), nên nút "Bắt đầu sáng tạo"
 * trông như không làm gì.
 *
 * Luật từ nay: URL bàn giao CHỈ mang định danh (topic/run id, mode, area,
 * assetId, productId — tất cả đều ngắn). Dữ liệu nặng (ảnh, report) được
 * Creative Studio tự tải lại bằng định danh đó qua API, không đi qua URL hay
 * `sessionStorage`. Kiểu tham số dưới đây CỐ Ý không có trường `imageUrl`/
 * `videoUrl`/`report` — thiếu ở tầng kiểu, không phải quy ước bằng lời.
 *
 * Thuần TypeScript — Zero external dependencies.
 */

export type HandoffProductionMode = "CREATIVE" | "AUTHENTIC"
export type HandoffSourceType = "image" | "video" | "both"

export interface HandoffUrlInput {
  /** ID lượt phân tích Product Intelligence (report.id = product_analysis_runs.id),
   *  hoặc ID topic khi bàn giao không qua Product Intelligence (vd. luồng /tai-anh). */
  readonly runOrTopicId: string
  readonly mode: HandoffProductionMode
  readonly source: HandoffSourceType
  /** BẮT BUỘC — ảnh phải đã lưu vào kho (`assets`), không chấp nhận Data URL/blob tạm. */
  readonly assetId: string
  readonly productName: string
  readonly area: "a" | "b" | "c" | "d" | "e" | "f"
  readonly productId?: string | undefined
  /** Chủ đề cụ thể user đã chọn trong report (Chặng 04) — khác với `runOrTopicId`
   *  khi đó đang mang report.id (lượt phân tích), không phải id của một topic. */
  readonly selectedTopicId?: string | undefined
  /** Phạm vi sản xuất chọn cuối Chặng 04 — `"all"` hoặc danh sách; bỏ trống = mặc định. */
  readonly platforms?: readonly string[] | "all" | undefined
  readonly outputs?: readonly string[] | "all" | undefined
}

/** Ghi phạm vi thành chuỗi query: `"all"` hoặc `a,b,c`. */
export function encodeScopeParam(v: readonly string[] | "all" | undefined): string | null {
  if (v === "all") return "all"
  if (!v || v.length === 0) return null
  return v.join(",")
}

/** Đọc lại phạm vi từ query: `null` → không chọn (mặc định), `"all"`, hoặc danh sách. */
export function decodeScopeParam(raw: string | null | undefined): string[] | "all" | undefined {
  if (!raw) return undefined
  if (raw.trim() === "all") return "all"
  const list = raw.split(",").map((x) => x.trim()).filter(Boolean)
  return list.length ? list : undefined
}

/** Tổng độ dài query string tối đa cho phép — cách xa hạn header ~16KB của Node,
 *  đủ chỗ cho tên sản phẩm dài mà vẫn không tới gần bẫy cũ. */
export const MAX_HANDOFF_QUERY_LENGTH = 2000

export class MissingAssetIdError extends Error {
  constructor() {
    super(
      "Không thể bàn giao sang Creative Studio: thiếu assetId — ảnh chưa được lưu vào kho ảnh."
    )
    this.name = "MissingAssetIdError"
  }
}

/**
 * Dựng `URLSearchParams` an toàn để bàn giao sang `/creative-studio`.
 * Ném lỗi ngay (không âm thầm bỏ qua) nếu thiếu `assetId` — đúng luật chặn
 * cứng "ảnh chưa lưu vào kho thì không đi tiếp" (chốt 22/09/2026).
 */
export function buildHandoffSearchParams(input: HandoffUrlInput): URLSearchParams {
  if (!input.assetId || !input.assetId.trim()) {
    throw new MissingAssetIdError()
  }
  if (!input.runOrTopicId || !input.runOrTopicId.trim()) {
    throw new Error("Không thể bàn giao sang Creative Studio: thiếu topic/run id.")
  }

  const params = new URLSearchParams()
  params.set("topic", input.runOrTopicId)
  params.set("mode", input.mode)
  params.set("source", input.source)
  params.set("assetId", input.assetId)
  params.set("area", input.area)
  if (input.productName) params.set("productName", input.productName)
  if (input.productId) params.set("productId", input.productId)
  if (input.selectedTopicId) params.set("selectedTopic", input.selectedTopicId)
  const platforms = encodeScopeParam(input.platforms)
  if (platforms) params.set("platforms", platforms)
  const outputs = encodeScopeParam(input.outputs)
  if (outputs) params.set("outputs", outputs)

  return params
}

/**
 * Cổng an toàn phụ (defense in depth) — không tin bất kỳ nơi gọi nào tự giữ
 * luật, kiểm lại chính chuỗi kết quả trước khi đưa cho `router.push`.
 * Trả `false` nếu chuỗi chứa dấu vết Data URL/blob hoặc vượt hạn độ dài.
 */
export function isSafeHandoffQueryString(queryString: string): boolean {
  if (queryString.length > MAX_HANDOFF_QUERY_LENGTH) return false
  if (queryString.includes("data:") || queryString.includes("blob:")) return false
  return true
}
