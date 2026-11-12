/**
 * Trần chiết khấu báo giá (PO 12/11/2026, audit BL-28) — luật thuần.
 * - Trần nền tảng: tổng giảm không quá 50% tiền hàng, với mọi người (cùng trần với Bộ sưu tập riêng).
 * - Trần Sale tự quyết: tiệm đặt (`order_discount.sale_max_percent`, mặc định 20%, tối đa 50%). Vượt mức này cần người
 *   có mã duyệt giá (C10 — Điều hành) lưu báo giá; chính thao tác lưu đó là phê duyệt, như giá dưới sàn.
 * Trước đây báo giá cho giảm tới hết tiền hàng; tiệm chưa nhập giá vốn thì sàn giá bằng 0 nên không có gì chặn.
 */
import { PLATFORM_MAX_DISCOUNT_PERCENT } from "@/modules/organization/domain/governance-decisions"

export const ORDER_DISCOUNT_SETTINGS_KEY = "order_discount"
export const DEFAULT_SALE_MAX_DISCOUNT_PERCENT = 20

/** Trần Sale tự quyết (%) từ cài đặt tổ chức: số nguyên 0..50; thiếu hoặc sai → mặc định 20. */
export function parseSaleMaxDiscountPercent(settings: unknown): number {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const raw = (root[ORDER_DISCOUNT_SETTINGS_KEY] as Record<string, unknown> | undefined)?.sale_max_percent
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= PLATFORM_MAX_DISCOUNT_PERCENT ? raw : DEFAULT_SALE_MAX_DISCOUNT_PERCENT
}

const fmt = (vnd: number) => `${vnd.toLocaleString("vi-VN")}đ`

/** Lỗi (tiếng Việt) khi mức giảm vượt trần, hoặc `null`. `canExceedSaleCap` = người lưu có mã duyệt giá (C10). */
export function quotationDiscountError(input: { subtotalVnd: number; discountVnd: number; saleMaxPercent: number; canExceedSaleCap: boolean }): string | null {
  const { subtotalVnd, discountVnd, saleMaxPercent, canExceedSaleCap } = input
  if (discountVnd <= 0 || subtotalVnd <= 0) return null
  const platformCap = Math.floor((subtotalVnd * PLATFORM_MAX_DISCOUNT_PERCENT) / 100)
  if (discountVnd > platformCap) return `Giảm giá vượt trần ${PLATFORM_MAX_DISCOUNT_PERCENT}% tiền hàng (tối đa ${fmt(platformCap)})`
  const saleCap = Math.floor((subtotalVnd * saleMaxPercent) / 100)
  if (!canExceedSaleCap && discountVnd > saleCap) {
    return `Giảm vượt mức Sale được tự quyết ${saleMaxPercent}% (tối đa ${fmt(saleCap)}) — nhờ Điều hành lưu báo giá này`
  }
  return null
}
