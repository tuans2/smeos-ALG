/**
 * Chấm ba kênh mà `AIC-04` khai: `factual`, `brand`, `readability`.
 *
 * Trước đây adapter trả cứng `0.8` cho cả ba. Ba hằng số đó đi thẳng vào
 * `ai_evaluations` và vào phán quyết `needsReview` của cổng AI, nên hệ thống
 * ghi lại một phép đo chưa từng chạy — tệ hơn là không đo, vì không đo thì
 * cổng AI biết mình đang thiếu (`YC-E10`) và đẩy sang người soát.
 *
 * Ba kênh dưới đây chấm bằng luật tất định trên chính dữ liệu đã có, không
 * gọi thêm một lượt mô hình nào. Chúng không thay Review → Approve: người
 * vẫn duyệt từng bản (`H6`). Chúng trả lời một câu hẹp hơn — bản này có bịa
 * ra hoa không có trong bó, có vi phạm ràng buộc thương hiệu không, có đọc
 * được không.
 *
 * Tệp thuần: không import hạ tầng.
 */

import type { HinhChieuPhanTich } from "./analysis-projection"

export type CopyOutput = {
  readonly suggested_name: string
  readonly suggested_description: string
  readonly suggested_tags: string[]
  readonly suggested_occasions: string[]
  readonly suggested_price_segment: string
  readonly short_headline?: string
  readonly key_selling_points?: string[]
  readonly flower_meaning_story?: string
}

export type NgữCảnhChấm = {
  readonly analysis: HinhChieuPhanTich
  /** Tên dịp mà tổ chức thật sự có trong danh mục. */
  readonly occasionNames: readonly string[]
  /** Cụm từ tổ chức cấm dùng (`brand_profiles.forbidden_styles`). */
  readonly forbidden: readonly string[]
}

export const DAI_MO_TA = { min: 200, max: 500 } as const
export const DAI_THE = { min: 3, max: 8 } as const
export const TEN_TOI_DA = 100

function bo_dau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
}

/**
 * Tách từ GIỮ NGUYÊN DẤU. Dùng cho phép đối chiếu tên hoa với câu chữ:
 * bỏ dấu trong tiếng Việt gộp những từ không liên quan gì tới nhau —
 * "Cẩm" trong "Cẩm tú cầu" thành "cam", trùng luôn với "cảm" trong "tình
 * cảm", và một đoạn quảng cáo chung chung sẽ được chấm là có nhắc tới sản
 * phẩm. Bỏ dấu vẫn đúng cho thẻ (thẻ bắt buộc không dấu) và cho tên dịp
 * (đối chiếu nguyên cụm, không theo từng từ).
 */
function tu_co_dau(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 2)
}

/**
 * `factual` — phần dữ kiện trong câu chữ có nguồn trong sản phẩm thật.
 *
 * Đếm hai thứ đo được mà không cần mô hình: dịp nêu ra phải nằm trong danh
 * mục dịp của tổ chức, và mọi CON SỐ nêu trong mô tả phải là một con số có
 * thật trong phân tích (số cành, số nụ, số lượng từng loại). "Bó 50 bông
 * hồng" viết cho một bó 20 bông là dữ kiện bịa, và đó là dạng sai đắt nhất
 * vì khách đọc xong sẽ đặt đúng con số đó.
 */
export function chamFactual(out: CopyOutput, ctx: NgữCảnhChấm): number {
  const diem: number[] = []

  const hopLeDip = out.suggested_occasions.filter((d) =>
    ctx.occasionNames.some((o) => bo_dau(o) === bo_dau(d))
  ).length
  diem.push(
    out.suggested_occasions.length === 0 ? 1 : hopLeDip / out.suggested_occasions.length
  )

  const soCoThat = new Set<number>()
  const them = (n: number | null) => {
    if (n !== null && n > 0) soCoThat.add(n)
  }
  them(ctx.analysis.flower_count)
  them(ctx.analysis.bud_count)
  them(ctx.analysis.damaged_count)
  for (const nhom of [
    ctx.analysis.bom.flowers,
    ctx.analysis.bom.foliage,
    ctx.analysis.bom.accessories,
  ]) {
    for (const tp of nhom) them(tp.quantity)
  }

  // Bỏ qua số nhỏ (1–10): chúng xuất hiện tự nhiên trong câu chữ ("một bó",
  // "3 tầng") và bắt lỗi chúng sẽ phạt oan nhiều hơn là bắt được dữ kiện bịa.
  const soTrongMoTa = (out.suggested_description.match(/\d+/g) ?? [])
    .map(Number)
    .filter((n) => n > 10)
  diem.push(
    soTrongMoTa.length === 0
      ? 1
      : soTrongMoTa.filter((n) => soCoThat.has(n)).length / soTrongMoTa.length
  )

  return Math.min(...diem)
}

/**
 * `brand` — bản này có tôn trọng ràng buộc của tổ chức không: không dùng cụm
 * từ bị cấm, và nằm trong khuôn độ dài/số thẻ đã khai với mô hình.
 */
export function chamBrand(out: CopyOutput, ctx: NgữCảnhChấm): number {
  const phanNoiDung = [
    out.suggested_name,
    out.short_headline ?? "",
    out.suggested_description,
    out.suggested_tags.join(" "),
    out.flower_meaning_story ?? "",
    ...(out.key_selling_points ?? []),
  ].join(" ")
  const noiDung = bo_dau(phanNoiDung)
  const viPham = ctx.forbidden.filter((c) => c.trim().length > 0 && noiDung.includes(bo_dau(c)))
  if (viPham.length > 0) return 0

  const dungKhuon = [
    out.suggested_name.length > 0 && out.suggested_name.length <= TEN_TOI_DA,
    out.suggested_tags.length >= DAI_THE.min && out.suggested_tags.length <= DAI_THE.max,
    out.suggested_tags.every((t) => t === bo_dau(t)),
    ["budget", "standard", "premium", "luxury"].includes(out.suggested_price_segment),
    out.short_headline ? out.short_headline.length <= 100 : true,
  ]
  return dungKhuon.filter(Boolean).length / dungKhuon.length
}

/**
 * `readability` — độ dài mô tả trong dải đã yêu cầu, câu không quá dài, và
 * câu chữ có thật sự nhắc tới sản phẩm này chứ không phải một đoạn chung chung
 * lắp vào sản phẩm nào cũng được.
 */
export function chamReadability(out: CopyOutput, ctx: NgữCảnhChấm): number {
  const doDai = out.suggested_description.length
  const trongDai =
    doDai >= DAI_MO_TA.min && doDai <= DAI_MO_TA.max
      ? 1
      : doDai === 0
        ? 0
        : Math.max(0, 1 - Math.abs(doDai - DAI_MO_TA.min) / DAI_MO_TA.max)

  const cau = out.suggested_description.split(/[.!?…]+/).filter((c) => c.trim().length > 0)
  const daiTrungBinh = cau.length === 0 ? 0 : doDai / cau.length
  const cauVua = daiTrungBinh > 0 && daiTrungBinh <= 140 ? 1 : 0.5

  const tuSanPham = new Set(
    [
      ctx.analysis.identity.category,
      ctx.analysis.identity.container,
      ...ctx.analysis.bom.flowers.map((f) => f.name),
    ]
      .filter((x): x is string => typeof x === "string")
      .flatMap(tu_co_dau)
  )
  const tuMoTa = new Set(tu_co_dau(out.suggested_description))
  const nhacToiSanPham =
    tuSanPham.size === 0 ? 1 : [...tuSanPham].some((t) => tuMoTa.has(t)) ? 1 : 0

  return Math.min(trongDai, cauVua, nhacToiSanPham)
}

export function chamBaKenh(
  out: CopyOutput,
  ctx: NgữCảnhChấm
): Readonly<Record<"factual" | "brand" | "readability", number>> {
  return {
    factual: chamFactual(out, ctx),
    brand: chamBrand(out, ctx),
    readability: chamReadability(out, ctx),
  }
}
