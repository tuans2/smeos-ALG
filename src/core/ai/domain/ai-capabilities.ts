/**
 * Sổ đăng ký năng lực AI — đặc tả 10 mục 4 và Phụ lục A.
 *
 * Cùng lối với `src/core/rbac/capability-catalog.ts`: ĐỊNH NGHĨA nằm trong mã
 * (để test khoá được và để một mã năng lực không tự sinh ra trong cơ sở dữ
 * liệu), phần VẬN HÀNH sửa được — ngưỡng chấp nhận, bật tắt — nằm ở bảng
 * `ai_capabilities`. `prisma/seed.ts` nạp bảng từ đây.
 *
 * Bốn năng lực `deterministic` không gọi mô hình. Chúng nằm trong sổ để chính
 * sách, sổ chi phí và phép đo có cùng một hình dạng cho mọi năng lực — không
 * phải để mở đường cho một mô hình chen vào sau.
 */

export type AiPrivacyLevel = "PUBLIC" | "SHOP" | "SENSITIVE"

export type AiCapabilityKind = "generative" | "measuring" | "deterministic"

export interface AiCapabilityDefinition {
  /** Mã `AIC-xx` — định danh chính, dùng trong tài liệu. */
  readonly code: string
  /** Tên đọc được, dùng làm `capability` trong lời gọi và `feature` trong usage. */
  readonly name: string
  readonly module: string
  readonly kind: AiCapabilityKind
  /** Đầu ra có phải qua Review → Approve trước khi thành dữ liệu chính thức. */
  readonly needsApproval: boolean
  /**
   * Sàn quyền riêng tư của chính năng lực, suy từ LOẠI DỮ LIỆU nó xử lý.
   * Sàn hiệu lực là mức cao nhất giữa sàn này, sàn của chính sách tổ chức và
   * mức của lời gọi — xem `effectivePrivacyFloor`.
   */
  readonly privacyFloor: AiPrivacyLevel
  /** Kênh chấm điểm. Rỗng với năng lực tất định — không có gì để chấm. */
  readonly channels: readonly string[]
}

// prettier-ignore
const DEFINITIONS: Record<string, Omit<AiCapabilityDefinition, "code">> = {
  "AIC-01": { name: "product_vision",              module: "M01",  kind: "generative",    needsApproval: true,  privacyFloor: "SHOP",      channels: ["component", "count", "taxonomy", "attribute"] },
  "AIC-02": { name: "object_counting",             module: "M01",  kind: "generative",    needsApproval: true,  privacyFloor: "SHOP",      channels: ["count"] },
  "AIC-03": { name: "color_analysis",              module: "M01",  kind: "measuring",     needsApproval: true,  privacyFloor: "SHOP",      channels: ["color"] },
  "AIC-04": { name: "product_copy",                module: "M01b", kind: "generative",    needsApproval: true,  privacyFloor: "SHOP",      channels: ["factual", "brand", "readability"] },
  "AIC-05": { name: "price_segment_hint",          module: "M01b", kind: "generative",    needsApproval: true,  privacyFloor: "SHOP",      channels: ["factual"] },
  "AIC-06": { name: "image_quality_analysis",      module: "M04a", kind: "measuring",     needsApproval: false, privacyFloor: "SHOP",      channels: ["quality"] },
  "AIC-07": { name: "product_segmentation",        module: "M04a", kind: "generative",    needsApproval: false, privacyFloor: "SHOP",      channels: ["mask_edge"] },
  "AIC-08": { name: "image_enhancement",           module: "M04a", kind: "generative",    needsApproval: true,  privacyFloor: "SHOP",      channels: ["product_integrity", "artifact", "composition"] },
  "AIC-09": { name: "smart_reframe",               module: "M04a", kind: "deterministic", needsApproval: false, privacyFloor: "SHOP",      channels: [] },
  "AIC-10": { name: "identity_verification",       module: "M04a", kind: "measuring",     needsApproval: false, privacyFloor: "SHOP",      channels: ["identity", "color", "geometry", "component_consistency"] },
  "AIC-11": { name: "background_removal",          module: "M04b", kind: "generative",    needsApproval: false, privacyFloor: "PUBLIC",    channels: ["mask_edge"] },
  "AIC-12": { name: "background_generation",       module: "M04b", kind: "generative",    needsApproval: true,  privacyFloor: "PUBLIC",    channels: ["product_integrity", "composition"] },
  "AIC-13": { name: "image_expansion",             module: "M04b", kind: "generative",    needsApproval: true,  privacyFloor: "PUBLIC",    channels: ["product_integrity", "artifact"] },
  "AIC-14": { name: "image_retouch_deterministic", module: "M04b", kind: "deterministic", needsApproval: false, privacyFloor: "PUBLIC",    channels: [] },
  "AIC-15": { name: "image_retouch_generative",    module: "M04b", kind: "generative",    needsApproval: true,  privacyFloor: "PUBLIC",    channels: ["product_integrity", "artifact"] },
  "AIC-16": { name: "watermark",                   module: "M04b", kind: "deterministic", needsApproval: false, privacyFloor: "PUBLIC",    channels: [] },
  "AIC-17": { name: "creative_variants",           module: "M04b", kind: "generative",    needsApproval: true,  privacyFloor: "PUBLIC",    channels: ["product_integrity", "composition"] },
  "AIC-18": { name: "video_storyboard",            module: "M04c", kind: "generative",    needsApproval: false, privacyFloor: "SHOP",      channels: ["plan_valid"] },
  "AIC-19": { name: "video_shot_generation",       module: "M04c", kind: "generative",    needsApproval: true,  privacyFloor: "PUBLIC",    channels: ["product_integrity", "motion", "audio", "subtitle"] },
  "AIC-20": { name: "video_assembly",              module: "M04c", kind: "deterministic", needsApproval: false, privacyFloor: "PUBLIC",    channels: [] },
  "AIC-21": { name: "text_to_speech",              module: "M04c", kind: "generative",    needsApproval: false, privacyFloor: "PUBLIC",    channels: ["pronunciation"] },
  "AIC-22": { name: "speech_to_text",              module: "M04c", kind: "generative",    needsApproval: false, privacyFloor: "PUBLIC",    channels: ["alignment"] },
  "AIC-23": { name: "content_generation",          module: "M07",  kind: "generative",    needsApproval: true,  privacyFloor: "SHOP",      channels: ["factual", "brand", "platform", "readability"] },
  "AIC-24": { name: "content_qa",                  module: "M07",  kind: "measuring",     needsApproval: false, privacyFloor: "SHOP",      channels: ["factual", "brand", "platform", "story"] },
  "AIC-25": { name: "catalog_copy",                module: "M06",  kind: "generative",    needsApproval: true,  privacyFloor: "SHOP",      channels: ["factual", "brand", "readability"] },
  "AIC-26": { name: "landing_page_plan",           module: "M05",  kind: "generative",    needsApproval: true,  privacyFloor: "SHOP",      channels: ["plan_valid", "brand"] },
  "AIC-27": { name: "product_embedding",           module: "M03",  kind: "generative",    needsApproval: false, privacyFloor: "SHOP",      channels: [] },
  "AIC-28": { name: "semantic_product_search",     module: "M03",  kind: "measuring",     needsApproval: false, privacyFloor: "SHOP",      channels: ["retrieval_hit"] },
  "AIC-29": { name: "customer_segmentation",       module: "M09",  kind: "generative",    needsApproval: false, privacyFloor: "SENSITIVE", channels: ["segment_agreement"] },
  "AIC-30": { name: "reminder_message",            module: "M09",  kind: "generative",    needsApproval: true,  privacyFloor: "SHOP",      channels: ["factual", "brand"] },
  "AIC-31": { name: "chat_intent_routing",         module: "M08",  kind: "generative",    needsApproval: false, privacyFloor: "SHOP",      channels: ["intent_match"] },
  "AIC-32": { name: "chat_answer",                 module: "M08",  kind: "generative",    needsApproval: false, privacyFloor: "SHOP",      channels: ["source_grounded"] },
  "AIC-33": { name: "analytics_interpretation",    module: "M11",  kind: "generative",    needsApproval: false, privacyFloor: "SHOP",      channels: ["operator_agreement"] },
  "AIC-34": { name: "learning_pattern",            module: "M11",  kind: "generative",    needsApproval: false, privacyFloor: "SHOP",      channels: ["sample_size", "effect_measured"] },
  "AIC-35": { name: "market_intel.topic_canonicalize", module: "MI", kind: "generative", needsApproval: false, privacyFloor: "PUBLIC",    channels: ["canonical_match"] },
  "AIC-36": { name: "market_intel.opportunity_draft",  module: "MI", kind: "generative", needsApproval: true,  privacyFloor: "SHOP",      channels: ["factual", "brand"] },
  "AIC-37": { name: "content_strategy",            module: "M07",  kind: "generative",    needsApproval: false, privacyFloor: "SHOP",      channels: ["factual", "brand"] },
}

export const AI_CAPABILITIES: Readonly<Record<string, AiCapabilityDefinition>> =
  Object.fromEntries(Object.entries(DEFINITIONS).map(([code, def]) => [code, { code, ...def }]))

export const ALL_AI_CAPABILITY_CODES: readonly string[] = Object.keys(AI_CAPABILITIES)

/** Tra theo tên đọc được — đây là thứ module truyền vào cổng AI. */
const BY_NAME: Readonly<Record<string, AiCapabilityDefinition>> = Object.fromEntries(
  Object.values(AI_CAPABILITIES).map((def) => [def.name, def])
)

export function aiCapability(codeOrName: string): AiCapabilityDefinition {
  const def = AI_CAPABILITIES[codeOrName] ?? BY_NAME[codeOrName]
  if (!def) throw new Error(`Năng lực AI không tồn tại: ${codeOrName}`)
  return def
}

export function isAiCapability(codeOrName: string): boolean {
  return Boolean(AI_CAPABILITIES[codeOrName] ?? BY_NAME[codeOrName])
}

/**
 * Năng lực tất định không bao giờ đi qua bộ định tuyến. Cổng AI chạy thẳng
 * đường mã và không ghi `ai_requests` với `model_key` — không có mô hình nào.
 */
export function isDeterministic(codeOrName: string): boolean {
  return aiCapability(codeOrName).kind === "deterministic"
}
