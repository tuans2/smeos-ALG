/**
 * SSOT thông tin mẫu hoa của một đơn / link Thẻ chào — mọi API trả đơn (theo dõi, điều phối, thanh toán)
 * dựng `product` bằng hàm này, giao diện chỉ đọc `product`, không tự chọn giữa ảnh chụp mẫu và dòng đơn.
 * Pure TypeScript.
 */
import { driveThumbProxySrc } from "./drive-thumb"

export interface OrderProductView {
  productId: string | null
  name: string
  code: string | null
  imageUrl: string | null
  price: number
  flowersSummary: string | null
  /** Phiên bản khách chọn và số cành của phiên bản (checklist ALG 2.4) — phiếu thợ in theo đây. */
  variantName: string | null
  stemCount: number | null
}

/** Hình dạng tối thiểu của đơn (hoặc một phiên link chưa có đơn: `items: []`). */
export interface OrderProductSource {
  items: Array<{ product_id?: string | null; metadata?: unknown; description?: string | null; unit_price_vnd?: unknown }>
  greeting_sessions: Array<{ selected_product_id?: string | null; product_snapshot?: unknown }>
}

type Loose = Record<string, unknown>
const obj = (v: unknown): Loose => (v && typeof v === "object" ? (v as Loose) : {})
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)
/** Số dương (nhận cả Prisma Decimal qua `Number()`), không thì `null`. */
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : v != null && v !== "" ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Sản phẩm của đơn: dòng đơn trước, mẫu khách chọn trên link sau. */
export function orderProductId(source: OrderProductSource): string | null {
  return source.items[0]?.product_id ?? source.greeting_sessions[0]?.selected_product_id ?? null
}

/**
 * Link ảnh trong kho được ký có hạn (`/api/v1/storage/...?exp=`). Ảnh chụp mẫu lưu nguyên link lúc khách
 * chọn, nên sau hạn ký (7 ngày) link chết — coi như không có để rơi về ảnh hiện tại trong kho.
 */
function liveImageUrl(url: string | null, nowMs: number): string | null {
  if (!url || !url.includes("/api/v1/storage/")) return url
  const exp = Number(/[?&]exp=(\d+)/.exec(url)?.[1])
  return Number.isFinite(exp) && exp <= nowMs ? null : url
}

/**
 * Ưu tiên: ảnh chụp mẫu lúc khách chọn → metadata dòng đơn → ảnh hiện tại trong kho (`images`, theo productId)
 * — đơn tạo tay hoặc mẫu chọn trước khi có ảnh vẫn hiện được ảnh cho mọi vai trò.
 */
export function orderProductView(source: OrderProductSource, images: ReadonlyMap<string, string>, fallbackName = "Sản phẩm theo mẫu", now = new Date()): OrderProductView {
  const snap = obj(source.greeting_sessions[0]?.product_snapshot)
  const item = source.items[0]
  const meta = obj(item?.metadata)
  const productId = orderProductId(source)
  return {
    productId,
    name: str(snap.name) ?? str(meta.name) ?? str(item?.description) ?? fallbackName,
    code: str(snap.code) ?? str(meta.code),
    // Cuối cùng: link Google Drive của mẫu (sản phẩm nhập từ Excel chưa có ảnh trong kho)
    imageUrl: liveImageUrl(str(snap.imageUrl), now.getTime()) ?? liveImageUrl(str(meta.imageUrl), now.getTime())
      ?? (productId ? images.get(productId) : undefined)
      ?? driveThumbProxySrc(str(snap.driveLink)) ?? driveThumbProxySrc(str(meta.driveLink)),
    price: num(snap.price) ?? num(meta.price) ?? num(item?.unit_price_vnd) ?? 0,
    flowersSummary: withVariant(str(snap.flowersSummary) ?? str(meta.flowersSummary), obj(meta.variant)),
    variantName: str(obj(meta.variant).name),
    stemCount: num(obj(meta.variant).stemCount),
  }
}

/** Công thức của mẫu kèm số cành theo phiên bản khách chọn — để mọi phiếu thợ đọc chung một dòng. */
function withVariant(summary: string | null, variant: Loose): string | null {
  const name = str(variant.name)
  const stems = num(variant.stemCount)
  if (!name || !stems) return summary
  const line = `Phiên bản ${name}: ${stems} cành`
  return summary ? `${line} · ${summary}` : line
}
