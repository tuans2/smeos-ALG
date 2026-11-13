import { withCircuitBreaker } from "@/core/http/circuit-breaker"
import type { GeoCoordinate } from "../domain/chain-dispatch-engine"
import type { IGeocoder } from "../use-cases/resolve-geo-location"
import type { FetchLike } from "./zalo-zns-adapter"

/**
 * Goong — chuyển địa chỉ Việt Nam thành toạ độ (Geocoding API).
 * Tài liệu: https://docs.goong.io/rest/geocode
 * Thiếu `GOONG_API_KEY` → không gọi, trả null (điều phối vẫn chạy, chỉ không tính khoảng cách).
 */
const GEOCODE_URL = "https://rsapi.goong.io/geocode"

/** Toạ độ ngoài khung lãnh thổ Việt Nam bị coi là kết quả sai */
const VN_BOUNDS = { minLat: 8, maxLat: 24, minLng: 102, maxLng: 110 }

export class GoongGeocoder implements IGeocoder {
  constructor(
    private readonly apiKey: string | undefined = process.env.GOONG_API_KEY,
    private readonly fetchImpl: FetchLike = fetch
  ) {}

  get configured(): boolean {
    return Boolean(this.apiKey)
  }

  async geocode(address: string): Promise<GeoCoordinate | null> {
    if (!this.apiKey || !address.trim()) return null
    const url = `${GEOCODE_URL}?address=${encodeURIComponent(address)}&api_key=${encodeURIComponent(this.apiKey)}`
    return withCircuitBreaker(
      "goong-geocode",
      async (signal) => {
        const res = await this.fetchImpl(url, { method: "GET", signal })
        if (!res.ok) throw new Error(`Goong từ chối (${res.status})`)
        const json = (await res.json().catch(() => ({}))) as {
          results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>
        }
        const loc = json.results?.[0]?.geometry?.location
        if (typeof loc?.lat !== "number" || typeof loc?.lng !== "number") return null
        const inVietnam =
          loc.lat >= VN_BOUNDS.minLat && loc.lat <= VN_BOUNDS.maxLat && loc.lng >= VN_BOUNDS.minLng && loc.lng <= VN_BOUNDS.maxLng
        return inVietnam ? { latitude: loc.lat, longitude: loc.lng } : null
      },
      { timeoutMs: 5_000 }
    )
  }
}
