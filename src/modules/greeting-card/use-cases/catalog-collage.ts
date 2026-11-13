import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { getPublicGreetingCatalog } from "./get-public-greeting-catalog"
import { getPublicGreetingCatalogBySlug } from "./get-public-greeting-catalog-by-slug"
import { PUBLIC_IMAGE_MAX_BYTES, isSafePublicImageUrl } from "../domain/public-image-url"
import { getGreetingCatalogForCustomer } from "./get-greeting-catalog"
import { webpToJpegDataUrl } from "../adapters/collage-image-transcoder"
import { fetchThumbnail, isValidDriveId, resolveFirstFileId } from "../adapters/google-drive-thumbnail"
import { driveThumbProxySrc } from "../domain/drive-thumb"
import { generateQRCodeDataUrl } from "@/core/media/qr-engine"
import { publicAppUrl } from "@/lib/public-url"

/** Ảnh ghép 3–4 mẫu tuỳ số mẫu có ảnh (ALG 5.4) */
export const COLLAGE_MAX_IMAGES = 4

export interface CatalogCollageData {
  catalogName: string
  shopName: string | null
  priceLabel: string | null
  /** Logo tiệm dạng data URL; null → dùng chữ cái đầu tên tiệm */
  logo: string | null
  /** Tổng số mẫu trong bộ sưu tập — ảnh hiện tối đa 4, phần còn lại thành nhãn "+N" */
  productCount: number
  /** Ảnh dạng data URL JPG/PNG — ảnh WEBP đã được đổi sang JPG vì bộ dựng ảnh không đọc được WEBP. */
  images: string[]
  /** Mã QR (data URL PNG) mở đúng link Thẻ chào đang chia sẻ; null khi chưa biết địa chỉ công khai */
  qr?: string | null | undefined
}

/** Link tuyệt đối của trang khách theo đường dẫn (vd. `/g/<id>`); null khi chưa cấu hình địa chỉ công khai. */
export function collageLinkUrl(path: string, base: string = publicAppUrl()): string | null {
  if (!base || !path.startsWith("/")) return null
  return `${base}${path}`
}

/** QR đen trên nền kem cho ảnh ghép; lỗi sinh mã thì bỏ QR, ảnh vẫn dựng. */
export async function collageQr(linkUrl: string | null): Promise<string | null> {
  if (!linkUrl) return null
  try {
    return await generateQRCodeDataUrl(linkUrl, { width: 240, margin: 1, darkColor: "#120A0D", lightColor: "#FBF5EE" })
  } catch {
    return null
  }
}

type PublicData = Awaited<ReturnType<typeof getPublicGreetingCatalog>>

const MIME_BY_EXT: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }

/** Khoá kho từ URL ký `/api/v1/storage/<key>?exp=…` do repository sinh. */
function storageKeyOf(url: string): string | null {
  const match = /^\/api\/v1\/storage\/([^?]+)/.exec(url)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function formatVnd(n: number): string {
  return `${n.toLocaleString("vi-VN")}đ`
}

/** "Từ 350.000đ" / "350.000đ – 1.200.000đ"; không mẫu nào có giá → null. */
export function priceLabelOf(prices: Array<number | null>): string | null {
  const known = prices.filter((p): p is number => typeof p === "number" && p > 0)
  if (known.length === 0) return null
  const min = Math.min(...known)
  const max = Math.max(...known)
  return min === max ? formatVnd(min) : `${formatVnd(min)} – ${formatVnd(max)}`
}

/** JPG/PNG giữ nguyên; WEBP đổi sang JPG; định dạng khác → null. */
async function toDataUrl(bytes: Uint8Array, mime: string): Promise<string | null> {
  if (mime === "image/webp") return webpToJpegDataUrl(bytes)
  if (mime === "image/jpeg" || mime === "image/png") return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`
  return null
}

function mimeOfContentType(contentType: string): string | null {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "image/jpeg"
  if (contentType.includes("png")) return "image/png"
  if (contentType.includes("webp")) return "image/webp"
  return null
}

async function loadFromStorage(url: string): Promise<string | null> {
  const key = storageKeyOf(url)
  const mime = key ? MIME_BY_EXT[key.split(".").pop()?.toLowerCase() ?? ""] : undefined
  if (!key || !mime) return null
  try {
    return await toDataUrl(await getStorageProvider().get(key), mime)
  } catch {
    return null // ảnh hỏng/mất: thử nguồn khác
  }
}

// Hỗ trợ ảnh từ URL tuyệt đối (CDN hoặc proxy ảnh công khai)
async function loadFromPublicUrl(url: string): Promise<string | null> {
  if (!isSafePublicImageUrl(url)) return null
  try {
    // Không theo chuyển hướng: một URL công khai có thể chuyển sang địa chỉ nội bộ
    const res = await fetch(url, { signal: AbortSignal.timeout(2500), redirect: "error" })
    const size = Number(res.headers.get("content-length") ?? "0")
    const mime = mimeOfContentType(res.headers.get("content-type")?.toLowerCase() || "")
    if (!res.ok || size > PUBLIC_IMAGE_MAX_BYTES || !mime) return null
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > PUBLIC_IMAGE_MAX_BYTES) return null
    return await toDataUrl(new Uint8Array(buffer), mime)
  } catch {
    return null // bỏ qua nếu lỗi mạng hoặc timeout
  }
}

/** Số nguồn ảnh thử tối đa — mẫu lỗi ảnh không làm thumbnail chờ quá lâu. */
const COLLAGE_MAX_ATTEMPTS = 8

// Sản phẩm nhập từ Excel chỉ có ảnh Google Drive: URL proxy `/api/v1/public/drive-thumb-proxy?...`
async function loadFromDriveProxy(url: string): Promise<string | null> {
  if (!url.startsWith("/api/v1/public/drive-thumb-proxy?")) return null
  const params = new URLSearchParams(url.split("?")[1])
  const fileId = params.get("file_id")
  const folderId = params.get("folder_id")
  try {
    const id = isValidDriveId(fileId) ? fileId : isValidDriveId(folderId) ? await resolveFirstFileId(folderId) : null
    const thumb = id ? await fetchThumbnail(id) : null
    const mime = thumb ? mimeOfContentType(thumb.contentType.toLowerCase()) : null
    return thumb && mime ? await toDataUrl(new Uint8Array(thumb.body), mime) : null
  } catch {
    return null
  }
}

async function loadOne(url: string): Promise<string | null> {
  return (await loadFromStorage(url)) ?? (await loadFromDriveProxy(url)) ?? (await loadFromPublicUrl(url))
}

type Loader = (url: string) => Promise<string | null>

async function loadImages(urls: string[], load: Loader = loadOne): Promise<string[]> {
  const out: string[] = []
  for (const url of urls.slice(0, COLLAGE_MAX_ATTEMPTS)) {
    if (out.length >= COLLAGE_MAX_IMAGES) break
    const image = await load(url)
    if (image) out.push(image)
  }
  return out
}

/** Ảnh hoa của một mẫu: ảnh trong kho/URL trước, rồi đến link Drive — giống ảnh trên trang khách. */
async function loadProductImages(products: CollageSource["products"], load: Loader): Promise<string[]> {
  const out: string[] = []
  for (const p of products.slice(0, COLLAGE_MAX_ATTEMPTS)) {
    if (out.length >= COLLAGE_MAX_IMAGES) break
    const sources = [p.imageUrl, driveThumbProxySrc(p.driveLink)].filter((u): u is string => !!u)
    for (const src of sources) {
      const image = await load(src)
      if (image) { out.push(image); break }
    }
  }
  return out
}

type CollageSource = {
  catalog: { name: string }
  shop?: { name: string; logoUrl?: string | null } | null
  products: Array<{ price: number | null; imageUrl: string | null; driveLink?: string | null | undefined }>
}

/** Dùng chung cho ảnh chia sẻ catalog `/c/[slug]` (Công cụ 09) — cùng cách nạp ảnh an toàn. */
export async function buildCollage(
  data: CollageSource,
  opts: { linkPath?: string | undefined; baseUrl?: string | undefined; load?: Loader | undefined } = {},
): Promise<CatalogCollageData> {
  const logoUrl = data.shop?.logoUrl
  const load = opts.load ?? loadOne
  return {
    catalogName: data.catalog.name,
    shopName: data.shop?.name ?? null,
    priceLabel: priceLabelOf(data.products.map((p) => p.price)),
    logo: logoUrl ? ((await loadImages([logoUrl], load))[0] ?? null) : null,
    productCount: data.products.length,
    images: await loadProductImages(data.products, load),
    qr: opts.linkPath ? await collageQr(collageLinkUrl(opts.linkPath, opts.baseUrl)) : null,
  }
}

async function toCollage(data: PublicData, linkPath: string): Promise<CatalogCollageData | null> {
  if (data.status !== "ACTIVE") return null
  return buildCollage(data, { linkPath })
}

/** `linkPath` = đường dẫn đang chia sẻ (`/g/<id>`, `/s/<mã>`) để QR mở đúng link đó. */
export async function catalogCollageById(catalogId: string, linkPath = `/g/${catalogId}`): Promise<CatalogCollageData | null> {
  return toCollage(await getPublicGreetingCatalog(catalogId), linkPath)
}

export async function catalogCollageBySlug(orgSlug: string, catalogCode: string): Promise<CatalogCollageData | null> {
  return toCollage(await getPublicGreetingCatalogBySlug(orgSlug, catalogCode), `/bst/${orgSlug}/${catalogCode}`)
}

export async function catalogCollageBySendCode(sendCode: string): Promise<CatalogCollageData | null> {
  const data = await getGreetingCatalogForCustomer(sendCode)
  if (data.status !== "ACTIVE") return null
  return buildCollage(data, { linkPath: `/b/${sendCode}` })
}
