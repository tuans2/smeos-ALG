/**
 * Brief từ dữ liệu ĐÃ DUYỆT của sản phẩm (hành trình Tạo nội dung, PO 08/11/2026 — Bước 3 viết bài từ Thẻ sản phẩm
 * + Bài giới thiệu + Thẻ chào sản phẩm). Dùng khi sản phẩm chưa có báo cáo phân tích thị trường — trước đây Brief
 * lúc đó chỉ có TÊN sản phẩm. Chỉ chiếu đúng những gì người dùng đã duyệt, không suy đoán (nguyên tắc Brief mục 3):
 * thiếu trường nào thì để trống.
 *
 * Ưu tiên: Thẻ chào (bản cuối user chốt) → Bài giới thiệu → Thẻ sản phẩm (kết quả quét). Thuần — không hạ tầng.
 */
import type { SalesPitchRecord } from "@/modules/products/domain/sales-pitch-record"
import type { RawPassportInput, RawProductComponent, RawProductInput } from "./brief-builder"

type Json = Record<string, unknown>

export interface ApprovedProductSources {
  readonly productId: string
  readonly productName: string
  /** Bản quét ảnh đã duyệt (edited ?? raw) */
  readonly analysis: Json | null
  /** Bài giới thiệu đã duyệt (raw + edited) */
  readonly copy: Json | null
  /** Thẻ chào sản phẩm đã chốt */
  readonly pitch: SalesPitchRecord | null
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter((s): s is string => s !== null) : [])
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null)
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {})

function bomComponents(analysis: Json | null): RawProductComponent[] {
  const bom = obj(analysis?.bom)
  const rows = (key: string, role: RawProductComponent["role"]): RawProductComponent[] =>
    (Array.isArray(bom[key]) ? (bom[key] as unknown[]) : []).flatMap((raw) => {
      const r = obj(raw)
      const name = str(r.name) ?? str(r.nhom_hoa)
      if (!name) return []
      const roleText = str(r.role)?.toLowerCase() ?? ""
      return [{
        flowerType: name,
        quantityEstimate: num(r.quantity) ?? num(r.count),
        unit: str(r.dvt_dem) ?? str(r.unit),
        role: role === "foliage" ? "foliage" : roleText.includes("phụ") ? "supporting" : role,
        color: str(r.mo_ta_mau) ?? str(r.mau) ?? str(r.color),
      }]
    })
  return [...rows("flowers", "dominant"), ...rows("foliage", "foliage")]
}

function pitchComponents(pitch: SalesPitchRecord): RawProductComponent[] {
  const map = (items: SalesPitchRecord["main_items"], role: RawProductComponent["role"]) =>
    items.filter((i) => i.name.trim()).map((i) => ({
      flowerType: i.name.trim(),
      quantityEstimate: num(i.quantity),
      unit: str(i.unit),
      role,
      color: str(i.color),
    }))
  return [...map(pitch.main_items, "dominant"), ...map(pitch.foliage_items, "foliage")]
}

function wrappingOf(analysis: Json | null): string | null {
  const layers = obj(analysis?.bom).wrapping
  if (!Array.isArray(layers)) return null
  const materials = layers.map((l) => str(obj(l).material)).filter((m): m is string => m !== null)
  return materials.length ? materials.join(", ") : null
}

/** Dữ liệu đã duyệt → `product` + `passport` của Brief v1. */
export function projectApprovedProduct(s: ApprovedProductSources): { product: RawProductInput; passport: RawPassportInput | null } {
  const identity = obj(s.analysis?.identity)
  const copy = s.copy ?? {}
  const pitch = s.pitch
  const pitchItems = pitch ? pitchComponents(pitch) : []
  const accessories = pitch?.accessory_items.length
    ? pitch.accessory_items.map((i) => i.name.trim()).filter(Boolean)
    : (Array.isArray(obj(s.analysis?.bom).accessories) ? (obj(s.analysis?.bom).accessories as unknown[]) : []).map((a) => str(obj(a).name)).filter((a): a is string => a !== null)

  const product: RawProductInput = {
    productId: s.productId,
    name: str(pitch?.product_name) ?? str(copy.suggested_name) ?? s.productName,
    style: str(pitch?.style) ?? str(copy.suggested_style) ?? str(identity.phong_cach),
    components: pitchItems.length ? pitchItems : bomComponents(s.analysis),
    packaging: {
      wrappingMaterial: str(pitch?.wrapping) ?? wrappingOf(s.analysis),
      wrappingColor: null,
      ribbon: null,
      accessories,
      cardText: null,
    },
    price: { exact: pitch?.price_vnd ?? null, rangeLabel: null },
  }

  const audience = obj(copy.target_audience)
  const cards = obj(copy.card_message_suggestions)
  const passport: RawPassportInput = {
    sellingPoints: strs(copy.key_selling_points),
    flowerMeaningStory: str(copy.flower_meaning_story) ?? str(copy.suggested_description),
    recipient: str(audience.recipient),
    buyerPersona: str(audience.buyer_persona),
    occasions: pitch?.occasions.length ? pitch.occasions : strs(copy.suggested_occasions),
    careInstructions: strs(copy.care_instructions),
    cardMessageSuggestions: Object.keys(cards).length
      ? { romantic: str(cards.romantic), subtle: str(cards.subtle), congratulatory: str(cards.congratulatory) }
      : null,
  }
  const empty = !passport.sellingPoints?.length && !passport.flowerMeaningStory && !passport.recipient && !passport.buyerPersona && !passport.occasions?.length
  return { product, passport: empty ? null : passport }
}
