import type { TenantContext } from "@/core/tenancy"
import { formatDate } from "@/lib/i18n/formatters"

import { csvCell, discountLabel } from "../domain/voucher-batch"
import type { IVoucherBatchRepository } from "../domain/repositories/voucher-batch-repository.interface"
import { getVoucherBatchRepository } from "../infra/voucher-batch-repository"
import { getVoucherBatch } from "./voucher-batches"

const dateVi = (d: Date | null) => formatDate(d)

/** CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt) — mỗi dòng một mã. */
export async function exportVoucherBatchCsv(
  ctx: TenantContext,
  id: string,
  repo: IVoucherBatchRepository = getVoucherBatchRepository(),
): Promise<{ filename: string; body: string }> {
  const { batch, codes } = await getVoucherBatch(ctx, id, repo)
  const header = ["Mã", "Mức giảm", "Đơn tối thiểu (đ)", "Bắt đầu", "Hết hạn", "Đã dùng", "Tổng lượt"].map(csvCell).join(",")
  const label = discountLabel(batch.discountType, batch.discountValue, batch.maxDiscountVnd)
  const lines = codes.map((c) =>
    [c.code, label, batch.minOrderVnd, dateVi(batch.startsAt), dateVi(batch.expiresAt), c.usedCount, c.usageLimit ?? "Không giới hạn"]
      .map(csvCell)
      .join(","),
  )
  return { filename: `ma-giam-gia-${batch.id.slice(0, 8)}.csv`, body: `﻿${[header, ...lines].join("\r\n")}\r\n` }
}
