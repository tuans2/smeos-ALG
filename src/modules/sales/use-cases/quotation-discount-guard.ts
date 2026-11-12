import { unprocessable } from "@/core/http/errors"
import { hasCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { parseSaleMaxDiscountPercent, quotationDiscountError } from "../domain/quotation-discount"

/** Mã duyệt giá của Điều hành — cùng mã cho phép lưu giá dưới sàn (`BELOW_FLOOR_CAPABILITY`, `capability-catalog.ts`). */
export const APPROVE_DISCOUNT_CAPABILITY = "C10"

/** Đọc cài đặt tổ chức — tách ra để test không cần CSDL. */
export async function orgSettingsOf(ctx: TenantContext): Promise<unknown> {
  return (await getOrganizationRepository().findById(ctx.organizationId))?.settings ?? null
}

/**
 * Chặn lưu báo giá giảm vượt trần (PO 12/11/2026, audit BL-28): vượt 50% tiền hàng → 422 với mọi người; vượt mức Sale
 * tự quyết của tiệm → 422 cho người không có mã duyệt giá (C10, Điều hành). Không giảm thì không đọc cài đặt.
 */
export async function assertQuotationDiscount(
  ctx: TenantContext,
  subtotalVnd: number,
  discountVnd: number,
  loadSettings: (ctx: TenantContext) => Promise<unknown> = orgSettingsOf,
): Promise<void> {
  if (discountVnd <= 0) return
  const error = quotationDiscountError({
    subtotalVnd,
    discountVnd,
    saleMaxPercent: parseSaleMaxDiscountPercent(await loadSettings(ctx)),
    canExceedSaleCap: hasCapability(ctx, APPROVE_DISCOUNT_CAPABILITY),
  })
  if (error) throw unprocessable(error, { reason: "DISCOUNT_CAP" })
}
