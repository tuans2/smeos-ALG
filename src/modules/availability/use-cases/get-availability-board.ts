import type { IAvailabilityRepository } from "../domain/repositories/availability-repository.interface"
import { getAvailabilityRepository } from "../infra/availability-repository"
import { parseAvailabilityConfig } from "@/modules/greeting-card/domain/product-availability-config"
import type { ProductBookingRecord } from "../domain/availability-mode"

export interface AvailabilityBoardProduct {
  id: string
  code: string
  name: string
  category: string | null
  status: string
  mode: string
  config: unknown
  inventoryStatus?: string | undefined
  quantityAvailable?: number | null | undefined
}

export interface AvailabilityBoardResult {
  month: string // "YYYY-MM"
  fromDate: string
  toDate: string
  days: string[] // ["2026-10-01", ..., "2026-10-31"]
  products: AvailabilityBoardProduct[]
  bookings: ProductBookingRecord[]
  industryKey?: string | null | undefined
}

export async function getAvailabilityBoard(
  organizationId: string,
  monthString?: string | undefined,
  industryKey?: string | null | undefined,
  repo: IAvailabilityRepository = getAvailabilityRepository(),
): Promise<AvailabilityBoardResult> {
  const now = new Date()
  const targetMonth = monthString && /^\d{4}-\d{2}$/.test(monthString)
    ? monthString
    : now.toISOString().slice(0, 7)

  const [yearStr, mStr] = targetMonth.split("-")
  const year = parseInt(yearStr!, 10)
  const month = parseInt(mStr!, 10)

  // Ngày đầu và cuối tháng (exclusive cho toDate)
  const fromDate = `${targetMonth}-01`
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const toDate = `${targetMonth}-${String(lastDay).padStart(2, "0")}`

  // Tạo mảng ngày
  const days: string[] = []
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${targetMonth}-${String(d).padStart(2, "0")}`)
  }

  const rawProducts = await repo.listProductsWithAvailability(organizationId)
  const bookings = await repo.listBookings(organizationId, fromDate, toDate)

  const products: AvailabilityBoardProduct[] = rawProducts.map((p) => {
    const parsed = parseAvailabilityConfig(p.availabilityConfig, industryKey)
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      status: p.status,
      mode: parsed.mode,
      config: parsed,
      inventoryStatus: p.inventoryStatus,
      quantityAvailable: p.quantityAvailable,
    }
  })

  return {
    month: targetMonth,
    fromDate,
    toDate,
    days,
    products,
    bookings,
    industryKey,
  }
}
