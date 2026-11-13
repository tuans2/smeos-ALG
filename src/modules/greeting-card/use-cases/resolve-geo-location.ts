/**
 * resolve-geo-location.ts
 *
 * Xác định toạ độ địa chỉ giao hàng của đơn để xếp hạng chi nhánh theo khoảng cách.
 * Kết quả (kể cả "không tìm thấy") được lưu theo địa chỉ đã chuẩn hoá — không gọi lại nhà cung cấp
 * cho cùng một địa chỉ; địa chỉ đổi thì tra lại. Lỗi nhà cung cấp không bao giờ chặn điều phối:
 * trả null và hệ thống xếp hạng như khi chưa có toạ độ.
 */

import type { TenantContext } from "@/core/tenancy"
import { log } from "@/core/observability/log"
import type { GeoCoordinate } from "../domain/chain-dispatch-engine"

export interface IGeocoder {
  readonly configured: boolean
  geocode(address: string): Promise<GeoCoordinate | null>
}

export interface DeliveryGeoEntry {
  addressKey: string
  location: GeoCoordinate | null
  resolvedAt: string
}

export interface IDeliveryGeoStore {
  loadDeliveryGeo(ctx: TenantContext, orderId: string): Promise<DeliveryGeoEntry | null>
  saveDeliveryGeo(ctx: TenantContext, orderId: string, entry: DeliveryGeoEntry): Promise<void>
}

/** "Không tìm thấy" chỉ được nhớ trong thời gian này rồi thử lại (nhà cung cấp có thể bổ sung dữ liệu) */
const NOT_FOUND_RETRY_MS = 6 * 60 * 60 * 1000

export function normalizeAddressKey(address: string): string {
  return address.normalize("NFC").toLowerCase().replace(/\s+/g, " ").replace(/\s*,\s*/g, ",").trim()
}

export async function resolveDeliveryLocation(
  ctx: TenantContext,
  input: { orderId: string; address: string },
  geocoder: IGeocoder,
  store: IDeliveryGeoStore,
  now = new Date()
): Promise<GeoCoordinate | null> {
  const addressKey = normalizeAddressKey(input.address)
  if (!addressKey) return null

  const cached = await store.loadDeliveryGeo(ctx, input.orderId)
  if (cached?.addressKey === addressKey) {
    if (cached.location) return cached.location
    if (now.getTime() - new Date(cached.resolvedAt).getTime() < NOT_FOUND_RETRY_MS) return null
  }
  if (!geocoder.configured) return null

  try {
    const location = await geocoder.geocode(input.address)
    await store.saveDeliveryGeo(ctx, input.orderId, { addressKey, location, resolvedAt: now.toISOString() })
    return location
  } catch (err) {
    // Lỗi mạng / nhà cung cấp: không lưu, lượt sau thử lại
    log.warn("geocode.delivery_failed", { orderId: input.orderId, error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

/** Trần số lần tra toạ độ chi nhánh mỗi lần nhập — vòng lặp luôn có giới hạn */
export const MAX_BRANCH_GEOCODES_PER_IMPORT = 200

/**
 * Chi nhánh có địa chỉ nhưng chưa có toạ độ → tra Goong (tuần tự, có trần). Toạ độ nhập tay trong
 * tệp luôn được giữ nguyên. Trả danh sách đã bổ sung toạ độ cùng số liệu để báo lại người nhập.
 */
export async function fillMissingBranchLocations<T extends { address?: string | null | undefined; location?: GeoCoordinate | null | undefined }>(
  branches: T[],
  geocoder: IGeocoder
): Promise<{ branches: T[]; geocoded: number; notFound: number; skipped: number }> {
  let geocoded = 0
  let notFound = 0
  let skipped = 0
  let attempts = 0
  const out: T[] = []
  for (const b of branches) {
    const address = b.address?.trim()
    if (b.location || !address) {
      out.push(b)
      continue
    }
    if (!geocoder.configured || attempts >= MAX_BRANCH_GEOCODES_PER_IMPORT) {
      skipped++
      out.push(b)
      continue
    }
    attempts++
    const location = await geocoder.geocode(address).catch((err: unknown) => {
      log.warn("geocode.branch_failed", { error: err instanceof Error ? err.message : String(err) })
      return null
    })
    if (location) geocoded++
    else notFound++
    out.push(location ? { ...b, location } : b)
  }
  return { branches: out, geocoded, notFound, skipped }
}
