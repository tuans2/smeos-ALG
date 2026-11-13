import { OrderPhotoRepository } from "@/modules/greeting-card/infra/order-photo-repository"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { driveThumbProxySrc } from "../domain/drive-thumb"
import { ownStorageKey, SIGNED_URL_TTL_SECONDS } from "./sign-subcontract-photo"

export interface OrderSampleSource {
  organization_id: string
  items?: Array<{
    product_id?: string | null
    description?: string | null
    metadata?: unknown
  }> | null
  greeting_sessions?: Array<{
    selected_product_id?: string | null
    product_snapshot?: unknown
  }> | null
}

/**
 * Giải quyết URL ảnh mẫu hoa của đơn hàng cho các kênh đối tác / màn hình gia công:
 * 1. Kiểm tra product_snapshot của greeting_sessions (ảnh chụp lúc khách chọn mẫu)
 * 2. Kiểm tra metadata của items[0] (ảnh chụp lưu ở dòng đơn)
 * 3. Nếu chưa có ảnh: Truy vấn ngược vào bảng products và product_images của kho hàng
 * 4. Nếu là storage key (org/... hoặc floraos-core/org/...) -> ký URL signedUrl GET hạn 7 ngày
 * 5. Nếu là link Google Drive -> proxy qua driveThumbProxySrc
 */
export async function resolveSubcontractSamplePhoto(
  order: OrderSampleSource,
  options?: { baseUrl?: string }
): Promise<string | null> {
  const firstItem = order.items?.[0]
  const session = order.greeting_sessions?.[0]
  const snapshot = (session?.product_snapshot as Record<string, unknown> | null) ?? {}
  const firstItemMeta = (firstItem?.metadata as Record<string, unknown> | null) ?? {}

  let rawImageUrl: string | null =
    (snapshot.image_url as string | undefined) ||
    (snapshot.imageUrl as string | undefined) ||
    (snapshot.image as string | undefined) ||
    (firstItemMeta.imageUrl as string | undefined) ||
    (firstItemMeta.image as string | undefined) ||
    (firstItemMeta.image_url as string | undefined) ||
    null

  const productId = firstItem?.product_id || session?.selected_product_id || null
  const productName = firstItem?.description || (snapshot.name as string | undefined) || null

  // Fallback 1: Nếu đơn chưa có ảnh trong snapshot/metadata nhưng có productId hoặc productName -> tra bảng products
  if (!rawImageUrl && (productId || productName)) {
    try {
      const photos = new OrderPhotoRepository()
      const productRow = await photos.findProductImages(order.organization_id, productId, productName)

      if (productRow) {
        const firstImg = productRow.images.find((i) => i.role === "MAIN") ?? productRow.images[0]
        if (firstImg?.asset_id) {
          const asset = await photos.findAsset(order.organization_id, firstImg.asset_id)
          if (asset?.storage_key) {
            rawImageUrl = asset.storage_key
          }
        }

        if (!rawImageUrl) {
          const attrs = (productRow.attributes as Record<string, unknown> | null) ?? {}
          if (typeof attrs.imageUrl === "string" && attrs.imageUrl) {
            rawImageUrl = attrs.imageUrl
          } else if (typeof attrs.drive_link === "string" && attrs.drive_link) {
            rawImageUrl = driveThumbProxySrc(attrs.drive_link)
          }
        }
      }
    } catch {
      // Fallback an toàn nếu lỗi DB
    }
  }

  // Fallback 2: Kiểm tra driveLink nếu có trong snapshot hoặc metadata
  if (!rawImageUrl) {
    const driveLink =
      (snapshot.driveLink as string | undefined) ||
      (snapshot.drive_link as string | undefined) ||
      (firstItemMeta.driveLink as string | undefined) ||
      (firstItemMeta.drive_link as string | undefined) ||
      null
    if (driveLink) {
      rawImageUrl = driveThumbProxySrc(driveLink)
    }
  }

  // Khoá kho -> URL ký 1 giờ, chỉ khi khoá nằm trong thư mục của chính tổ chức (rà soát cụm G)
  if (rawImageUrl && (rawImageUrl.startsWith("org/") || rawImageUrl.includes("floraos-core/org/") || rawImageUrl.includes("smeos-core/org/"))) {
    const key = ownStorageKey(rawImageUrl, order.organization_id)
    rawImageUrl = key ? await getStorageProvider().signedUrl(key, SIGNED_URL_TTL_SECONDS, "GET").catch(() => null) : null
  }

  if (!rawImageUrl) return null

  // Chuẩn hóa thành absolute URL hoặc thay localhost bằng baseUrl hiện tại
  if (options?.baseUrl) {
    const origin = options.baseUrl.replace(/\/+$/, "")
    if (rawImageUrl.startsWith("/")) {
      return `${origin}${rawImageUrl}`
    }
    // Nếu URL cũ từng bị lưu cứng http://localhost:3200 hoặc http://localhost:3000 -> chuyển sang baseOrigin
    if (rawImageUrl.includes("localhost:") || rawImageUrl.includes("127.0.0.1:")) {
      try {
        const parsed = new URL(rawImageUrl)
        return `${origin}${parsed.pathname}${parsed.search}`
      } catch {
        // ignore
      }
    }
  }

  return rawImageUrl
}
