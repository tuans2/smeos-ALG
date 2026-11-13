/**
 * Luật của chính sách AI — thuần, không import hạ tầng.
 *
 * Chính sách là TRẦN mà bộ định tuyến được chọn trong đó (D17), nên mọi luật ở
 * đây chỉ có thể SIẾT phạm vi, không bao giờ mở rộng nó.
 */
import { aiCapability, type AiPrivacyLevel } from "@/core/ai/domain/ai-capabilities"

export type AiPolicyInput = {
  capability_code: string
  allowed_models: string[]
  quality_target?: string | null | undefined
  cost_ceiling?: number | null | undefined
  privacy_floor: AiPrivacyLevel
}

const PRIVACY_RANK: Record<AiPrivacyLevel, number> = { PUBLIC: 0, SHOP: 1, SENSITIVE: 2 }
const QUALITY = new Set(["thap", "trung_binh", "cao"])

/**
 * Năng lực mà `U2` một mình không đủ để đổi.
 *
 * `AIC-01` đã có đường ghi riêng (`PUT /vision/engine`, `H4`) cùng một màn hình
 * nói rõ bộ nào đã đo và bộ nào gửi ảnh ra ngoài. Cho `U2` đổi nó mà không đòi
 * `H4` là mở một cửa thứ hai vào cùng một quyết định, và cửa thứ hai không có
 * lời cảnh báo nào.
 */
export const CAPABILITIES_REQUIRING_H4: readonly string[] = ["AIC-01", "product_vision"]

export function requiresVisionEngineCapability(capabilityCode: string): boolean {
  return CAPABILITIES_REQUIRING_H4.includes(capabilityCode)
}

/**
 * Soát một chính sách trước khi ghi. Trả về bản đồ lỗi rỗng nghĩa là hợp lệ —
 * cùng hình dạng với `validateBrandProfileInput` để route dùng chung
 * `validationFailed`.
 */
export function validateAiPolicyInput(
  input: AiPolicyInput,
  eligibleModelKeys: readonly string[]
): Record<string, string> {
  const errors: Record<string, string> = {}

  let capability
  try {
    capability = aiCapability(input.capability_code)
  } catch {
    errors.capability_code = "Năng lực không có trong sổ đăng ký"
    return errors
  }

  if (capability.kind === "deterministic") {
    errors.capability_code = "Năng lực tất định không gọi mô hình, nên không có chính sách mô hình"
  }

  const unknown = input.allowed_models.filter((key) => !eligibleModelKeys.includes(key))
  if (unknown.length > 0) {
    // Mô hình thiếu một ô giấy phép cũng rơi vào đây, vì sổ đăng ký không coi
    // nó là đủ điều kiện (D18) — người dùng không cần biết mô hình đó tồn tại.
    errors.allowed_models = `Mô hình không đủ điều kiện: ${unknown.join(", ")}`
  }

  const duplicates = input.allowed_models.filter(
    (key, index) => input.allowed_models.indexOf(key) !== index
  )
  if (duplicates.length > 0) errors.allowed_models = "Danh sách mô hình có phần tử trùng"

  if (PRIVACY_RANK[input.privacy_floor] < PRIVACY_RANK[capability.privacyFloor]) {
    errors.privacy_floor = `Không hạ được sàn quyền riêng tư dưới ${capability.privacyFloor} của chính năng lực`
  }

  if (input.quality_target && !QUALITY.has(input.quality_target)) {
    errors.quality_target = "Chỉ nhận thap · trung_binh · cao"
  }

  if (typeof input.cost_ceiling === "number" && input.cost_ceiling < 0) {
    errors.cost_ceiling = "Trần chi phí không âm"
  }

  return errors
}
