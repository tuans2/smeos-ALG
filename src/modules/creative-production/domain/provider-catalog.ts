/**
 * Danh mục nhà cung cấp của Creative Studio — nguồn chuẩn DUY NHẤT (PO 25/09/2026).
 *
 * Quyết định PO: mọi bước TẠO kết quả (nội dung, giọng đọc, nhạc nền, ảnh,
 * video) ưu tiên nhà cung cấp trả phí để đạt chất lượng cao nhất; xử lý cục
 * bộ CHỈ là phương án lùi khi mọi nhà cung cấp đều lỗi (worker ghi rõ lý do,
 * core hoàn phần chênh credit — bảng giá v1). Nhiều nhà cung cấp VAI TRÒ
 * TƯƠNG ĐƯƠNG cho mỗi loại; tiệm đặt thứ tự ưu tiên trong Cài đặt, mỗi lượt
 * tạo vẫn đổi được bên (cả hai cấp).
 *
 * Khoá ở đây phải khớp từng chữ với khoá phía thực thi:
 *   - `content`         → `ai_models.key` (cổng AI, `src/core/ai/`)
 *   - `image_optimize`  → `workers/media_ai/providers/enhancement/router.py`
 *   - `image_variant`   → `workers/media_ai/providers/scene/registry.py`
 *   - `video`           → `workers/media_ai/video/providers/__init__.py`
 *   - `voice`           → `workers/media_ai/audio/tts_engine.py`
 *   - `music`           → `workers/media_ai/audio/music_engine.py`
 * `provider-catalog.test.ts` khoá phần TS; ca thử Python khoá phía worker.
 *
 * Thuần: không import hạ tầng.
 */

export const PROVIDER_KINDS = ["content", "image_optimize", "image_variant", "video", "voice", "music"] as const
export type ProviderKind = (typeof PROVIDER_KINDS)[number]

export interface ProviderOption {
  readonly key: string
  /** Tên model/sản phẩm thật — dùng nội bộ (vận hành nền tảng, đối soát), không hiện cho cửa hàng. */
  readonly label: string
  /** Tên trung tính hiển thị cho cửa hàng: mô tả đặc điểm, không tên hãng/model (PO 06/11/2026). */
  readonly displayName: string
  /** Hãng — dùng nội bộ, không hiện cho cửa hàng. */
  readonly vendor: string
  /** Biến môi trường chứa khoá — thiếu thì bên này được bỏ qua trong chuỗi. */
  readonly envKey: string
  readonly quality: "cao" | "trung_binh"
  readonly note: string
}

export interface ProviderKindSpec {
  readonly label: string
  /** Nhà cung cấp, theo thứ tự mặc định (chất lượng cao trước). */
  readonly providers: readonly ProviderOption[]
  /** Đường lùi cục bộ khi MỌI nhà cung cấp lỗi — không chọn được làm bên chính. */
  readonly localFallback: { readonly key: string; readonly label: string } | null
}

export const PROVIDER_CATALOG: Readonly<Record<ProviderKind, ProviderKindSpec>> = {
  content: {
    label: "Nội dung (kịch bản, bài đăng, viết lại)",
    providers: [
      { key: "claude_opus", label: "Claude Opus 5", displayName: "Văn phong tự nhiên nhất", vendor: "Anthropic", envKey: "ANTHROPIC_API_KEY", quality: "cao", note: "Câu chữ tiếng Việt tự nhiên, bám sát thông tin sản phẩm" },
      { key: "openai_structured", label: "GPT-4o", displayName: "Ổn định, đã kiểm chứng", vendor: "OpenAI", envKey: "OPENAI_API_KEY", quality: "cao", note: "Kết quả đều, dùng lâu nhất trên hệ thống" },
      { key: "gemini_pro", label: "Gemini 2.5 Pro", displayName: "Hiểu ngữ cảnh dài", vendor: "Google", envKey: "GEMINI_API_KEY", quality: "cao", note: "Đọc được nhiều thông tin cùng lúc" },
      { key: "claude_sonnet", label: "Claude Sonnet 5", displayName: "Cân bằng tốc độ và chất lượng", vendor: "Anthropic", envKey: "ANTHROPIC_API_KEY", quality: "trung_binh", note: "Nhanh hơn, chi phí vừa phải" },
      { key: "gemini_flash", label: "Gemini 2.5 Flash", displayName: "Nhanh, tiết kiệm", vendor: "Google", envKey: "GEMINI_API_KEY", quality: "trung_binh", note: "Phản hồi nhanh, chi phí thấp" },
      { key: "openai_direct", label: "GPT-4o mini", displayName: "Nhanh, tiết kiệm (dự phòng)", vendor: "OpenAI", envKey: "OPENAI_API_KEY", quality: "trung_binh", note: "Phản hồi nhanh, chi phí thấp" },
    ],
    localFallback: { key: "template", label: "Mẫu bài có sẵn (không dùng AI)" },
  },
  image_optimize: {
    label: "Tối ưu ảnh Master (Khu vực A)",
    providers: [
      { key: "photoroom", label: "Photoroom", displayName: "Tách nền và phông studio", vendor: "Photoroom", envKey: "PHOTOROOM_API_KEY", quality: "cao", note: "Tách nền, đặt phông studio, thêm bóng và ánh sáng" },
      { key: "fal_flux", label: "fal.ai Product Shot", displayName: "Dựng ảnh sản phẩm", vendor: "fal.ai", envKey: "FAL_KEY", quality: "cao", note: "Tách nền, dựng phông và làm nét ảnh" },
      { key: "imagen", label: "Google Gemini Image", displayName: "Dựng phông theo mô tả", vendor: "Google", envKey: "GEMINI_API_KEY", quality: "cao", note: "Dựng phông, chỉnh sáng, giữ nguyên sản phẩm từ ảnh gốc" },
      { key: "openai", label: "OpenAI Image", displayName: "Chỉnh ảnh giữ nguyên sản phẩm", vendor: "OpenAI", envKey: "OPENAI_API_KEY", quality: "cao", note: "Chỉnh ảnh, bảo vệ vùng sản phẩm" },
    ],
    localFallback: { key: "studio", label: "Tách nền và phông có sẵn" },
  },
  image_variant: {
    label: "Biến thể ảnh marketing (Khu vực D)",
    providers: [
      { key: "fal", label: "fal.ai Product Shot", displayName: "Dựng cảnh giữ vị trí sản phẩm", vendor: "fal.ai", envKey: "FAL_KEY", quality: "cao", note: "Dựng cảnh và hoà ánh sáng, giữ nguyên vị trí sản phẩm" },
      { key: "stability", label: "Stability AI Relight", displayName: "Thay nền và chỉnh hướng sáng", vendor: "Stability AI", envKey: "STABILITY_API_KEY", quality: "cao", note: "Thay nền, chỉnh hướng sáng, tạo lại được cùng kết quả" },
      { key: "imagen", label: "Google Gemini Image", displayName: "Dựng cảnh theo mô tả", vendor: "Google", envKey: "GEMINI_API_KEY", quality: "cao", note: "Dựng cảnh theo mô tả, giữ nguyên sản phẩm từ ảnh gốc" },
    ],
    localFallback: { key: "local_studio", label: "Phông có sẵn" },
  },
  video: {
    label: "Video (Khu vực E)",
    providers: [
      { key: "veo", label: "Google Veo", displayName: "Video điện ảnh", vendor: "Google", envKey: "GEMINI_API_KEY", quality: "cao", note: "Biến ảnh thành video kiểu điện ảnh" },
      { key: "kling", label: "Kling", displayName: "Chuyển động tự nhiên", vendor: "Kuaishou (qua fal.ai)", envKey: "FAL_KEY", quality: "cao", note: "Biến ảnh thành video, chuyển động mượt" },
      { key: "runway", label: "Runway Gen-4", displayName: "Điều khiển góc máy", vendor: "Runway", envKey: "RUNWAYML_API_SECRET", quality: "cao", note: "Biến ảnh thành video, chọn được chuyển động máy quay" },
      { key: "luma", label: "Luma Ray 2", displayName: "Ánh sáng mềm", vendor: "Luma AI (qua fal.ai)", envKey: "FAL_KEY", quality: "cao", note: "Biến ảnh thành video, ánh sáng dịu" },
    ],
    localFallback: { key: "local_cinematic", label: "Video trượt ảnh có sẵn" },
  },
  voice: {
    label: "Giọng đọc (Khu vực C)",
    providers: [
      { key: "elevenlabs", label: "ElevenLabs", displayName: "Giọng tự nhiên nhất", vendor: "ElevenLabs", envKey: "ELEVENLABS_API_KEY", quality: "cao", note: "Giọng đọc tự nhiên, có thể tạo giọng riêng" },
      { key: "openai", label: "OpenAI TTS", displayName: "Giọng rõ, ổn định", vendor: "OpenAI", envKey: "OPENAI_API_KEY", quality: "cao", note: "Giọng đọc rõ ràng, ổn định" },
      { key: "minimax", label: "MiniMax", displayName: "Giọng tiếng Việt ấm", vendor: "MiniMax", envKey: "MINIMAX_API_KEY", quality: "trung_binh", note: "Giọng đọc tiếng Việt ấm áp" },
      { key: "edge_tts", label: "Microsoft Edge TTS", displayName: "Giọng đọc miễn phí", vendor: "Microsoft", envKey: "", quality: "trung_binh", note: "Miễn phí, không cần kết nối thêm" },
    ],
    localFallback: null,
  },
  music: {
    label: "Nhạc nền (Khu vực C)",
    providers: [
      { key: "elevenlabs_music", label: "ElevenLabs Music", displayName: "Nhạc nền theo tâm trạng", vendor: "ElevenLabs", envKey: "ELEVENLABS_API_KEY", quality: "cao", note: "Tạo nhạc nền theo cảm xúc video, được dùng thương mại" },
    ],
    localFallback: { key: "library", label: "Thư viện nhạc có sẵn" },
  },
}

export function providerOption(kind: ProviderKind, key: string): ProviderOption | undefined {
  return PROVIDER_CATALOG[kind].providers.find((p) => p.key === key)
}

export function isProviderKind(value: unknown): value is ProviderKind {
  return typeof value === "string" && (PROVIDER_KINDS as readonly string[]).includes(value)
}

/** Thứ tự mặc định của nền tảng (chất lượng cao trước). */
export function defaultProviderOrder(kind: ProviderKind): string[] {
  return PROVIDER_CATALOG[kind].providers.map((p) => p.key)
}

/**
 * Thứ tự thử cho MỘT lượt tạo: bên người dùng chọn cho lượt này → thứ tự tiệm
 * đã đặt → phần còn lại theo mặc định. Khoá lạ bị bỏ; không trùng; KHÔNG chứa
 * đường cục bộ (worker tự lùi về đó khi hết danh sách, và ghi lý do).
 */
export function resolveProviderOrder(
  kind: ProviderKind,
  orgOrder?: readonly string[] | null,
  requested?: string | null
): string[] {
  const known = new Set(defaultProviderOrder(kind))
  const out: string[] = []
  for (const key of [requested, ...(orgOrder ?? []), ...defaultProviderOrder(kind)]) {
    if (key && known.has(key) && !out.includes(key)) out.push(key)
  }
  return out
}

/** Chuẩn hoá thứ tự tiệm gửi lên — phải là hoán vị (có thể thiếu) của các khoá đã biết. */
export function validateOrgOrder(kind: ProviderKind, order: unknown): { ok: true; order: string[] } | { ok: false; error: string } {
  if (!Array.isArray(order) || order.some((k) => typeof k !== "string")) return { ok: false, error: "order phải là mảng khoá" }
  const known = new Set(defaultProviderOrder(kind))
  const la = (order as string[]).filter((k) => !known.has(k))
  if (la.length > 0) return { ok: false, error: `Khoá không có trong danh mục ${kind}: ${la.join(", ")}` }
  if (new Set(order).size !== order.length) return { ok: false, error: "order có khoá trùng" }
  if (order.length === 0) return { ok: false, error: "order không được rỗng" }
  return { ok: true, order: [...(order as string[])] }
}

/** Đọc thứ tự của tiệm từ `organizations.settings.creative_providers`. */
export function orgProviderOrders(settings: unknown): Partial<Record<ProviderKind, string[]>> {
  const raw = settings && typeof settings === "object" ? (settings as Record<string, unknown>).creative_providers : null
  if (!raw || typeof raw !== "object") return {}
  const out: Partial<Record<ProviderKind, string[]>> = {}
  for (const kind of PROVIDER_KINDS) {
    const v = (raw as Record<string, unknown>)[kind]
    if (Array.isArray(v)) out[kind] = v.filter((k): k is string => typeof k === "string")
  }
  return out
}
