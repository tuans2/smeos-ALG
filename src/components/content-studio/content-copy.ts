/**
 * Câu chữ của hành trình Tạo nội dung trên /cong-cu — một chỗ duy nhất. Thuần — không React.
 */
import type { JourneyStepTile } from "@/components/journey/journey-step-tiles"
import { CONTENT_STEPS, CONTENT_STEP_LABELS, contentLockedReason, type ContentProductFlags, type ContentStep } from "@/modules/content-studio/domain/content-journey"
import type { JourneyStepStatus } from "@/modules/journey/domain/journey-model"

export const LOCK_SHORT: Record<ContentStep, string> = {
  PRODUCT_CARD: "",
  SALES_PITCH: "Mở khi Bước 1 được duyệt",
  CHANNEL_POSTS: "Mở khi đã chốt Thẻ chào",
  AUTO_PUBLISH: "",
}

function summaryOf(step: ContentStep, f: ContentProductFlags | null): { text: string; percent: number } {
  if (f === null) {
    return step === "PRODUCT_CARD" ? { text: "Tải ảnh để bắt đầu", percent: 0 } : { text: "Hoặc chọn từ Kho", percent: 0 }
  }
  if (step === "PRODUCT_CARD") {
    const done = Number(f.cardApproved) + Number(f.copyApproved)
    return { text: done === 2 ? "Đã duyệt đủ" : f.cardApproved ? "Còn Bài giới thiệu" : "Còn duyệt Thẻ", percent: done * 50 }
  }
  if (step === "SALES_PITCH") return f.pitchSaved ? { text: "Đã lưu vào Kho", percent: 100 } : { text: "Kiểm tra rồi duyệt", percent: 50 }
  if (step === "CHANNEL_POSTS") return f.approvedPosts > 0 ? { text: `${f.approvedPosts} lượt bài đã duyệt`, percent: 100 } : { text: "Viết bài từng nền tảng", percent: 0 }
  return { text: "Kết nối kênh, lên lịch", percent: 0 }
}

export function contentStepTiles(statuses: readonly JourneyStepStatus[], f: ContentProductFlags | null): JourneyStepTile<ContentStep>[] {
  return CONTENT_STEPS.map((key, i) => {
    const status = statuses[i] ?? "AVAILABLE"
    const sum = summaryOf(key, f)
    return { key, label: CONTENT_STEP_LABELS[key], status, summary: status === "LOCKED" ? LOCK_SHORT[key] : sum.text, percent: sum.percent }
  })
}

/** Gợi ý dưới hàng ô bước khi có bước đang khoá. */
export function lockHint(step: ContentStep | null, f: ContentProductFlags | null): string | null {
  if (!step) return null
  const reason = contentLockedReason(step, f)
  return reason ? `${reason} để mở ${CONTENT_STEP_LABELS[step]}.` : null
}

export const MODE_COPY = {
  ONE_PRODUCT: { title: "Một sản phẩm", text: "Một hoặc nhiều góc chụp của cùng một sản phẩm → một Thẻ sản phẩm. Ảnh đầu tiên là ảnh chính để quét." },
  MANY_PRODUCTS: { title: "Nhiều sản phẩm", text: "Mỗi ảnh là một sản phẩm khác nhau — quét cùng lúc, mỗi ảnh ra một Thẻ sản phẩm." },
} as const

/** Tên hiển thị của một Thẻ sản phẩm chưa duyệt (từ kết quả quét). */
export function cardName(data: Record<string, unknown>, fallback: string): string {
  const identity = (data.identity as Record<string, unknown> | undefined) ?? {}
  const v = data.product_name ?? identity.product_name ?? data.name ?? identity.category
  return typeof v === "string" && v.trim() ? v : fallback
}
