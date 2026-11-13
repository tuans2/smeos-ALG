/**
 * Chỉ đạo khung hình cho biến thể Khu vực D (Đợt 1 nâng cấp chất lượng ảnh,
 * 24/09/2026). Nói bằng Ý ĐỊNH của ALG — không bằng tên tham số của nhà
 * cung cấp; adapter phía worker (`providers/background/`) tự dịch.
 *
 * Nguồn giá trị, theo thứ tự ưu tiên:
 *   1. người gọi gửi tường minh (hợp đồng Chặng 06c);
 *   2. đúng cảnh trong kịch bản sản xuất tổng (Chặng 05): `shot`, `lighting`, `palette`;
 *   3. mặc định: khung đúng tỉ lệ đích, cỡ trung, giữa khung, sáng từ trái
 *      (hướng bóng cũ — ảnh không đổi khi không có kịch bản).
 *
 * Thuần — không Prisma, không mạng.
 */

export const VARIANT_SHOTS = ["close", "medium", "wide"] as const
export type VariantShot = (typeof VARIANT_SHOTS)[number]

export const VARIANT_PLACEMENTS = ["center", "left_third", "right_third"] as const
export type VariantPlacement = (typeof VARIANT_PLACEMENTS)[number]

export const LIGHT_DIRECTIONS = ["left", "right", "above", "front"] as const
export type LightDirection = (typeof LIGHT_DIRECTIONS)[number]

/** `full_frame` = hậu cảnh dựng đúng khung đích (PO chốt mặc định 24/09/2026); `pad` = hành vi cũ. */
export const FILL_MODES = ["full_frame", "pad"] as const
export type FillMode = (typeof FILL_MODES)[number]

export const MAX_VARIANT_SEED = 4_294_967_294
export const MAX_PALETTE_COLORS = 5

/**
 * Phong cách hình ảnh hậu cảnh (Đợt 2, 25/09/2026) — Ý ĐỊNH của ALG, không
 * phải `style_preset` của Stability. Adapter worker tự dịch
 * (`providers/background/stability_background.py#STYLE_SANG_PRESET`); nhà cung
 * cấp không hỗ trợ thì ghi `provider_ignored`, không âm thầm bỏ.
 *   natural   — ảnh chụp thật, trung tính (mặc định khi không chọn)
 *   cinematic — tương phản điện ảnh, chiều sâu
 *   film      — màu phim analog, hạt nhẹ
 *   vivid     — màu tươi, nét rõ
 */
export const VARIANT_STYLES = ["natural", "cinematic", "film", "vivid"] as const
export type VariantStyle = (typeof VARIANT_STYLES)[number]

/**
 * Tuỳ chọn dựng ảnh (Đợt 3, 25/09/2026) — ý định ALG, khớp `CHAT_LUONG` /
 * `TANG_NET` / `CACH_GHEP` ở `workers/media_ai/providers/background/base.py`.
 *   quality      standard | high (đám mây: Stability Ultra; cục bộ: provider_ignored)
 *   upscale      none | 2x (khung xuất ×2; tăng nét HẬU CẢNH — sản phẩm không qua mô hình siêu phân giải)
 *   compose_mode paste | harmonize | relight
 *     relight   = NHÀ CUNG CẤP LÀM TRỌN GÓI (tách nền, dựng cảnh, ghép, chỉnh sáng, tăng nét) —
 *                 MẶC ĐỊNH của nhánh đám mây (PO 25/09/2026); cổng đo `perceptual`;
 *     paste     = ALG tự dán nguyên khối sản phẩm lên hậu cảnh (giữ từng điểm ảnh) —
 *                 mặc định của nhánh cục bộ; trên đám mây = chỉ xin hậu cảnh;
 *     harmonize = như paste + hoà bóng / độ nét (xử lý cục bộ).
 */
export const VARIANT_QUALITIES = ["standard", "high"] as const
export type VariantQuality = (typeof VARIANT_QUALITIES)[number]
export const VARIANT_UPSCALES = ["none", "2x"] as const
export type VariantUpscale = (typeof VARIANT_UPSCALES)[number]
export const COMPOSE_MODES = ["paste", "harmonize", "relight"] as const
export type ComposeMode = (typeof COMPOSE_MODES)[number]

export const VARIANT_STYLE_LABELS: Readonly<Record<VariantStyle, string>> = {
  natural: "Chụp thật",
  cinematic: "Điện ảnh",
  film: "Phim analog",
  vivid: "Màu tươi",
}

export interface VariantDirectionInput {
  readonly fillMode?: FillMode | undefined
  readonly composition?: { readonly shot?: VariantShot | undefined; readonly placement?: VariantPlacement | undefined } | undefined
  readonly lighting?: { readonly direction?: LightDirection | undefined; readonly mood?: string | undefined } | undefined
  readonly palette?: readonly string[] | undefined
  readonly seed?: number | undefined
  readonly style?: VariantStyle | undefined
}

/** Phần cảnh của kịch bản mà chỉ đạo khung hình cần (ScenePlanScene). */
export interface PlanSceneHint {
  readonly shot?: string | undefined
  readonly lighting?: string | undefined
  readonly palette?: readonly string[] | undefined
}

export interface VariantDirection {
  readonly fillMode: FillMode
  readonly composition: { readonly shot: VariantShot; readonly placement: VariantPlacement }
  readonly lighting: { readonly direction: LightDirection; readonly mood?: string | undefined }
  readonly palette: readonly string[]
  readonly seed?: number | undefined
  readonly style?: VariantStyle | undefined
  /** Trường nào lấy từ kịch bản (để ghi vết, hiển thị "theo kịch bản"). */
  readonly fromPlan: readonly ("shot" | "lighting" | "palette")[]
}

function isShot(v: unknown): v is VariantShot {
  return typeof v === "string" && (VARIANT_SHOTS as readonly string[]).includes(v)
}

/**
 * Hướng sáng từ câu mô tả ánh sáng của kịch bản (tiếng Việt hoặc Anh).
 * Không nhận ra thì `null` — người gọi dùng mặc định.
 */
export function inferLightDirection(text: string | null | undefined): LightDirection | null {
  const t = (text ?? "").toLowerCase()
  if (!t.trim()) return null
  if (/(bên trái|phía trái|từ trái|\btrái\b|from the left|\bleft\b)/.test(t)) return "left"
  if (/(bên phải|phía phải|từ phải|\bphải\b|from the right|\bright\b)/.test(t)) return "right"
  if (/(từ trên|trên cao|đỉnh đầu|trần|ánh sáng trên|overhead|from above|top light)/.test(t)) return "above"
  if (/(chính diện|trực diện|phía trước|trước mặt|frontal|from the front)/.test(t)) return "front"
  return null
}

function cleanPalette(list: readonly string[] | undefined): string[] {
  return Array.from(
    new Set((list ?? []).map((c) => c.trim().slice(0, 40)).filter((c) => c.length > 0))
  ).slice(0, MAX_PALETTE_COLORS)
}

export function resolveVariantDirection(
  input: VariantDirectionInput,
  scene?: PlanSceneHint | null
): VariantDirection {
  const fromPlan: ("shot" | "lighting" | "palette")[] = []

  let shot: VariantShot = "medium"
  if (input.composition?.shot) shot = input.composition.shot
  else if (isShot(scene?.shot)) {
    shot = scene.shot
    fromPlan.push("shot")
  }

  let direction: LightDirection = "left"
  if (input.lighting?.direction) direction = input.lighting.direction
  else {
    const inferred = inferLightDirection(scene?.lighting)
    if (inferred) {
      direction = inferred
      fromPlan.push("lighting")
    }
  }

  let palette = cleanPalette(input.palette)
  if (palette.length === 0 && scene?.palette?.length) {
    palette = cleanPalette(scene.palette)
    if (palette.length > 0) fromPlan.push("palette")
  }

  const mood = input.lighting?.mood?.trim().slice(0, 120)
  const seed =
    typeof input.seed === "number" && Number.isInteger(input.seed)
      ? Math.max(0, Math.min(MAX_VARIANT_SEED, input.seed))
      : undefined

  return {
    fillMode: input.fillMode ?? "full_frame",
    composition: { shot, placement: input.composition?.placement ?? "center" },
    lighting: { direction, ...(mood ? { mood } : {}) },
    palette,
    ...(seed !== undefined ? { seed } : {}),
    ...(input.style ? { style: input.style } : {}),
    fromPlan,
  }
}

/** Phần payload job `media.variant[.cloud]` mà worker đọc (snake_case). */
export function variantDirectionPayload(d: VariantDirection): Record<string, unknown> {
  return {
    fill_mode: d.fillMode,
    composition: { shot: d.composition.shot, placement: d.composition.placement },
    lighting: { direction: d.lighting.direction, ...(d.lighting.mood ? { mood: d.lighting.mood } : {}) },
    ...(d.palette.length > 0 ? { palette: [...d.palette] } : {}),
    ...(d.seed !== undefined ? { seed: d.seed } : {}),
    ...(d.style ? { style: d.style } : {}),
    ...(d.fromPlan.length > 0 ? { direction_from_plan: [...d.fromPlan] } : {}),
  }
}
