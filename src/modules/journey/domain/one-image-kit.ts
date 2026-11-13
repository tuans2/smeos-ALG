/**
 * Luồng "Từ 1 ảnh" (checklist ALG 7.2): một ảnh → thẻ sản phẩm nháp → nội dung bán hàng → đề xuất giá
 * vốn từ BOM × đơn giá nguyên liệu → bài đăng Facebook/Zalo → thẻ A6. Chặng hành trình chạy (PO Q12):
 * 01 Tải ảnh, 02 Nhận diện, 06 Nội dung và ảnh, 08 Kiểm tra, 09 Duyệt, 10 Đăng; bỏ 03–05 và 11–14.
 * Mỗi bước AI là một job riêng (trừ credit lúc tạo job, hoàn khi job hỏng); bước tất định không tốn credit.
 * Pure TypeScript.
 */

export const ONE_IMAGE_KIT_STAGES = ["01", "02", "06", "08", "09", "10"] as const

export const KIT_STEPS = ["PRODUCT", "COPY", "COST", "POSTS", "CARD"] as const
export type KitStep = (typeof KIT_STEPS)[number]

export const KIT_STEP_LABEL: Record<KitStep, string> = {
  PRODUCT: "Thẻ sản phẩm nháp",
  COPY: "Nội dung bán hàng",
  COST: "Đề xuất giá vốn",
  POSTS: "Bài đăng Facebook/Zalo",
  CARD: "Thẻ A6",
}

/** Kênh bài đăng của bộ nội dung */
export const KIT_CHANNELS = ["facebook", "zalo"] as const

export interface KitCost {
  totalVnd: number
  complete: boolean
  missingPrices: string[]
  unmatched: string[]
}

export interface KitPost {
  channel: string
  text: string
  hashtags: string[]
  needsReview: boolean
}

export interface KitOutputs {
  productId: string | null
  copyId: string | null
  cost: KitCost | null
  contentGenerationId: string | null
  posts: KitPost[]
  printRenditionId: string | null
}

export type KitResult =
  | { status: "READY"; outputs: KitOutputs; failedStep: null; error: null }
  | { status: "FAILED"; outputs: KitOutputs; failedStep: KitStep; error: string }

export const EMPTY_KIT_OUTPUTS: KitOutputs = { productId: null, copyId: null, cost: null, contentGenerationId: null, posts: [], printRenditionId: null }

/** Khoá chống trùng riêng cho từng bước AI: bấm lại cùng khoá không tính tiền hai lần. */
export function kitStepKey(idempotencyKey: string, step: KitStep): string {
  return `${idempotencyKey}:${step.toLowerCase()}`
}

/** Số đầu ra đã có (tối đa 5) — dùng cho thanh tiến độ. */
export function kitOutputCount(o: KitOutputs): number {
  return [o.productId, o.copyId, o.cost, o.contentGenerationId, o.printRenditionId].filter((v) => v !== null).length
}
