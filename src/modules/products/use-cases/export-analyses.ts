import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import {
  dongXuatCuaPhanTich,
  dungCsv,
  type DongXuat,
} from "@/modules/products/domain/analysis-export"
import { ProductAnalysisRepository, getProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"
import type { approval_state } from "@/modules/products/infra/entities"

const TRAN_LUOT = 5000

const TRANG_THAI_HOP_LE = ["PENDING", "APPROVED", "REJECTED"] as const

/**
 * `GET /vision/analyses/export` (`H3`). Trả CSV mã hoá UTF-8 kèm BOM — Excel
 * mở thẳng bằng một cú nhấp trên cả Windows lẫn macOS.
 *
 * Trần `TRAN_LUOT` lượt phân tích mỗi lần xuất. Không phân trang con trỏ như
 * các route đọc khác: một tệp xuất chia làm nhiều mảnh thì người dùng phải
 * tự ghép lại trong Excel, và đó là chỗ dữ liệu hỏng. Chạm trần thì thu hẹp
 * khoảng thời gian, và phần trả về nói rõ đã chạm.
 */
export async function exportAnalyses(
  ctx: TenantContext,
  options: {
    states?: string[] | undefined
    from?: string | null | undefined
    to?: string | null | undefined
  }
): Promise<{ csv: string; soLuot: number; soDong: number; chamTran: boolean }> {
  const states: approval_state[] = []
  for (const s of options.states ?? []) {
    if (!(TRANG_THAI_HOP_LE as readonly string[]).includes(s)) {
      throw validationFailed({ states: `Trạng thái không hợp lệ: ${s}` })
    }
    states.push(s as approval_state)
  }

  const moc = (value: string | null | undefined, ten: string): Date | undefined => {
    if (!value) return undefined
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) throw validationFailed({ [ten]: "Không phải mốc thời gian hợp lệ" })
    return d
  }
  const from = moc(options.from, "from")
  const to = moc(options.to, "to")
  if (from && to && from > to) {
    throw validationFailed({ from: "Mốc đầu muộn hơn mốc cuối" })
  }

  const rows = await getProductAnalysisRepository().listForExport!(ctx, {
    states,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    limit: TRAN_LUOT,
  })

  const dong: DongXuat[] = []
  for (const row of rows) {
    dong.push(
      ...dongXuatCuaPhanTich({
        id: row.id,
        asset_id: row.asset_id,
        job_id: row.job_id,
        product_id: row.product_id,
        approval_state: row.approval_state,
        approved_by: row.approved_by,
        approved_at: row.approved_at ? row.approved_at.toISOString() : null,
        created_at: row.created_at.toISOString(),
        provider: row.provider,
        model: row.model,
        contract_version: row.contract_version,
        raw: row.raw as Record<string, unknown>,
        edited: row.edited as Record<string, unknown> | null,
      })
    )
  }

  return {
    csv: dungCsv(dong),
    soLuot: rows.length,
    soDong: dong.length,
    chamTran: rows.length === TRAN_LUOT,
  }
}
