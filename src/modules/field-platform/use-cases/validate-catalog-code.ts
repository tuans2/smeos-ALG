import { AppError } from "@/core/http/errors"
import { FieldCatalogRepository, getFieldCatalogRepository } from "../infra/field-catalog-repository"

/**
 * ĐP-4a.1 (26/09/2026) — kiểm một mã giá trị có phải mã ĐANG ACTIVE của một
 * danh mục hay không (Đặc tả trường §16.2/§16.3, D12: cột lưu mã chuỗi,
 * kiểm theo danh mục ở tầng ứng dụng — không phải Prisma enum). Dùng bởi
 * use-case GHI của module tiêu thụ danh mục (Điều phối…) TRƯỚC transaction,
 * y hệt cách `create-coordinator-order.ts` đã kiểm `productId`/`customerId`
 * tồn tại. Không kiểm ở tầng zod (`http-schemas.ts`) vì danh mục đọc từ DB,
 * schema zod thuần không gọi DB.
 *
 * `code` rỗng/`undefined` được BỎ QUA (trường tuỳ chọn — không có giá trị
 * thì không có gì để kiểm); gọi nơi khác quyết định trường có bắt buộc hay
 * không trước khi gọi hàm này.
 */
export interface ActiveCatalogValue {
  code: string
  label: string
  /** Mã hành vi thật (`behaviors.ts`) khi danh mục CÓ HÀNH VI — null cho danh mục MỞ/ĐÓNG. */
  behavior: string | null
  params: Record<string, unknown> | null
}

/**
 * ĐP-4a.2 (26/09/2026) — đọc mã giá trị ĐANG ACTIVE kèm `behavior`/`params`
 * (dùng để TÍNH, vd. SLA từ `serviceLevel` — `sla-calculation.ts`), thay vì
 * chỉ kiểm tồn tại. Trả `null` khi không có `code` hoặc mã không active —
 * gọi nơi khác quyết định đó có phải lỗi hay không.
 */
export async function getActiveCatalogValue(
  catalogKey: string,
  code: string | null | undefined
): Promise<ActiveCatalogValue | null> {
  if (!code) return null
  const repo = getFieldCatalogRepository()
  const values = await repo.listValues(catalogKey)
  const found = values.find((v) => v.code === code && v.is_active)
  if (!found) return null
  return {
    code: found.code,
    label: found.label,
    behavior: found.behavior,
    params: (found.params as Record<string, unknown> | null) ?? null,
  }
}

export async function assertActiveCatalogCode(
  catalogKey: string,
  code: string | null | undefined,
  fieldLabel: string
): Promise<void> {
  if (!code) return
  const found = await getActiveCatalogValue(catalogKey, code)
  if (!found) {
    throw new AppError(
      "UNPROCESSABLE_ENTITY",
      `${fieldLabel} "${code}" không hợp lệ hoặc đã bị tắt trong danh mục`,
      { catalogKey, code }
    )
  }
}
