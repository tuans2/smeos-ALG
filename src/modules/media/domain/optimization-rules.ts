/**
 * Luật thuần của M04a phía core (P9) — hai cổng, đừng nhầm là một.
 *
 * **Cổng 1, Identity Guard**: cổng AN TOÀN KỸ THUẬT, MÁY chấm, chạy ở
 * `workers/media_ai/`. Câu hỏi: "AI có làm sai lệch sản phẩm thật không?".
 * Kết quả là `generation_jobs.result` — `SAFE`/`GOOD`/`WARNING`/`REJECTED`.
 *
 * **Cổng 2, Review & Approve**: cổng NGHIỆP VỤ, NGƯỜI chấm, chạy ở đây.
 * Câu hỏi: "ảnh này có được dùng làm ảnh chính thức của sản phẩm không?".
 * Kết quả là `assets.approval_state`.
 *
 * Guard PASS không thay được Approve, và tải ảnh về không phải là phê duyệt
 * (M04 mục 5.1) — ba việc, ba mã năng lực: `I1` chạy, `I3` tải, `I2` duyệt.
 *
 * Tệp này không import hạ tầng.
 */

/**
 * Bộ máy tối ưu ảnh worker `media.optimize` thật sự có
 * (`workers/media_ai/providers/enhancement/router.py#ENHANCER_REGISTRY`) — cả
 * nhánh cục bộ lẫn nhánh nhà cung cấp đều đi qua hàng đợi (25/09/2026, trả nợ
 * #120). Mã lạ bị từ chối ở route thay vì để worker âm thầm lùi về Studio.
 * `gemini`/`replicate` không có ở đây: hai bộ máy đó ở worker còn là stub luôn
 * lùi PIL — nhận chúng là bán một lựa chọn không tồn tại.
 */
export const OPTIMIZE_ENHANCER_PROVIDERS = ["auto", "studio", "local", "openai", "photoroom", "fal_flux", "fal", "imagen"] as const
export type OptimizeEnhancerProvider = (typeof OPTIMIZE_ENHANCER_PROVIDERS)[number]

export function isOptimizeEnhancerProvider(value: unknown): value is OptimizeEnhancerProvider {
  return typeof value === "string" && (OPTIMIZE_ENHANCER_PROVIDERS as readonly string[]).includes(value)
}

/** Bộ máy gọi nhà cung cấp trả phí — thu giá `media.optimize.cloud` (bảng giá v1, 25/09/2026). */
export const OPTIMIZE_CLOUD_PROVIDERS = ["openai", "photoroom", "fal_flux", "fal", "imagen"] as const satisfies readonly OptimizeEnhancerProvider[]

/**
 * PO 25/09/2026 — nhà cung cấp TRƯỚC: mọi lượt tối ưu chạy chuỗi nhà cung cấp
 * (`provider_order`) trừ khi người dùng chọn ĐÍCH DANH bộ máy cục bộ.
 * `"auto"` / vắng = theo thứ tự ưu tiên của tiệm.
 */
export function isExplicitLocalEngine(provider: unknown): boolean {
  return provider === "studio" || provider === "local"
}

/** Khoá giá của một lượt tối ưu: theo BỘ MÁY được chọn, không theo cờ `engine`. */
export function optimizationPriceKey(config: Record<string, unknown> | undefined): "media.optimize" | "media.optimize.cloud" {
  const order = config?.provider_order
  if (Array.isArray(order) && order.length > 0) return "media.optimize.cloud"
  const provider = config?.enhancer_provider
  if (provider === "auto") return "media.optimize.cloud"
  return typeof provider === "string" && (OPTIMIZE_CLOUD_PROVIDERS as readonly string[]).includes(provider)
    ? "media.optimize.cloud"
    : "media.optimize"
}

export const GUARD_RESULTS = ["SAFE", "GOOD", "WARNING", "REJECTED"] as const
export type GuardResult = (typeof GUARD_RESULTS)[number]

export function isGuardResult(value: unknown): value is GuardResult {
  return typeof value === "string" && (GUARD_RESULTS as readonly string[]).includes(value)
}

/**
 * `YC-R5` — "Kết quả `REJECTED` không được vào luồng duyệt". Cổng an toàn đã
 * nói ảnh này làm sai lệch sản phẩm; cho người duyệt bấm qua nó là bỏ luôn
 * ý nghĩa của cổng cứng. Endpoint dịch `false` ở đây thành 409, không phải
 * 403: người gọi có quyền, chỉ là bản ghi không ở trạng thái duyệt được.
 */
export function canApproveOptimization(result: GuardResult): boolean {
  return result !== "REJECTED"
}

/**
 * `YC-R6` — "Kết quả `WARNING` duyệt được, nhưng giao diện phải cảnh báo
 * trước". Giao diện không đọc được ý định của máy chủ, nên máy chủ phải NÓI
 * ra cờ này trong phần trả về, thay vì để giao diện tự suy từ chuỗi `result`
 * (mỗi màn hình tự suy một kiểu là cách cảnh báo biến mất dần).
 */
export function requiresWarningBeforeApprove(result: GuardResult): boolean {
  return result === "WARNING"
}

/** Job chưa xong thì chưa có gì để duyệt — khác hẳn với "bị từ chối". */
export function isTerminalGuardStatus(status: string): boolean {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED"
}

export type IdentityGuardBlock = {
  identity_score: number
  color_score: number
  geometry_score: number
  component_consistency: number
  result: GuardResult
  ly_do: string[]
  provider?: string
  model_version?: string
}

/**
 * Đọc khối bốn điểm từ payload của sự kiện `guard`. Trả `null` khi thiếu
 * hoặc sai hình dạng — job chưa chạy tới bước Guard là chuyện bình thường,
 * không phải lỗi.
 *
 * Vì sao khối này nằm ở `job_events` chứ không phải một cột: đặc tả 07 không
 * khai bảng nào cho M04a, và chỗ CẦN đọc nó nhất lại là lúc bị từ chối —
 * đúng lúc không có `assets` nào được tạo để gắn metadata vào.
 */
export function parseIdentityGuardBlock(payload: unknown): IdentityGuardBlock | null {
  if (typeof payload !== "object" || payload === null) return null
  const p = payload as Record<string, unknown>
  if (!isGuardResult(p.result)) return null

  const diem = (key: string): number | null => {
    const value = p[key]
    return typeof value === "number" && Number.isFinite(value) ? value : null
  }
  const identity = diem("identity_score")
  const color = diem("color_score")
  const geometry = diem("geometry_score")
  const component = diem("component_consistency")
  if (identity === null || color === null || geometry === null || component === null) return null

  return {
    identity_score: identity,
    color_score: color,
    geometry_score: geometry,
    component_consistency: component,
    result: p.result,
    ly_do: Array.isArray(p.ly_do) ? p.ly_do.filter((x): x is string => typeof x === "string") : [],
    ...(typeof p.provider === "string" ? { provider: p.provider } : {}),
    ...(typeof p.model_version === "string" ? { model_version: p.model_version } : {}),
  }
}
