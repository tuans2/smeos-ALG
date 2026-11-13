/**
 * Lớp chấm điểm — đặc tả 10 mục 9, nhóm yêu cầu `YC-E`.
 *
 * Ba cổng chất lượng khác nhau, KHÔNG cổng nào thay cổng nào:
 *   điểm chất lượng   ← máy chấm mọi đầu ra AI (tệp này)
 *   Identity Guard    ← máy chấm riêng nhận dạng sản phẩm, cổng cứng của M04a
 *   Review → Approve  ← người ra phán quyết, Luật 3 của PRD
 *
 * Ngưỡng của Identity Guard (0,95 và 0,90) đã chốt với chủ sản phẩm và sống ở
 * cấu hình của `workers/media_ai/guard/` — KHÔNG chép lại vào đây. Một con số
 * đã chốt nằm ở hai chỗ là một con số sẽ lệch.
 */
import type { AiCapabilityDefinition } from "./ai-capabilities"

export type ChannelScores = Readonly<Record<string, number>>

export type EvaluationResult =
  | {
      readonly kind: "hop_le"
      readonly overall: number
      readonly needsReview: boolean
      readonly thresholdUsed: number | null
      readonly reason: string | null
    }
  | {
      readonly kind: "khong_hop_le"
      /**
       * Kênh đã khai nhưng đầu ra không mang — `YC-E10`. Đây KHÔNG phải điểm 0:
       * một kênh thiếu nghĩa là phép chấm chưa chạy đủ, còn điểm 0 nghĩa là đã
       * chấm và kết quả tệ. Gộp hai thứ lại là để một lỗi đo trông như một kết
       * quả xấu, và rồi có người đi sửa mô hình thay vì sửa phép đo.
       */
      readonly missingChannels: readonly string[]
    }

/**
 * Chấm một đầu ra. `threshold` lấy từ `ai_capabilities.accept_threshold`;
 * `null` nghĩa là chưa đo được (D20) — khi đó cổng AI CHẤM, GHI, KHÔNG CHẶN.
 */
export function evaluateOutput(
  capability: AiCapabilityDefinition,
  scores: ChannelScores,
  threshold: number | null
): EvaluationResult {
  if (capability.kind === "deterministic") {
    return { kind: "hop_le", overall: 1, needsReview: false, thresholdUsed: null, reason: null }
  }

  const missingChannels = capability.channels.filter(
    (channel) => typeof scores[channel] !== "number" || Number.isNaN(scores[channel])
  )
  if (missingChannels.length > 0) return { kind: "khong_hop_le", missingChannels }

  // Sau bước trên, mọi kênh đã khai đều có số — `?? 1` chỉ để thoả kiểu.
  const values = capability.channels.map((channel) => scores[channel] ?? 1)
  // Điểm tổng là kênh THẤP NHẤT, không phải trung bình: một đầu ra đúng dữ kiện
  // nhưng sai giọng thương hiệu không phải một đầu ra "khá tốt", nó là một đầu
  // ra không dùng được ở đúng phần nó sai.
  const overall = values.length > 0 ? Math.min(...values) : 1

  if (threshold === null) {
    return {
      kind: "hop_le",
      overall,
      needsReview: false,
      thresholdUsed: null,
      reason: "chua_co_nguong_da_do",
    }
  }

  const needsReview = overall < threshold
  return {
    kind: "hop_le",
    overall,
    needsReview,
    thresholdUsed: threshold,
    reason: needsReview ? "diem_duoi_nguong" : null,
  }
}
