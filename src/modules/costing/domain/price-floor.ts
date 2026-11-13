/**
 * Giá sàn của đơn (checklist ALG 3.4, 9.11): sàn của một mẫu = giá vốn × hệ số Sàn của cửa hàng
 * (`floor_ceiling_ratio.floorRatio`), làm tròn LÊN nghìn — giá sàn không bao giờ thấp hơn thật.
 * Sàn của đơn = tổng sàn từng dòng × số lượng. Chỉ tính các mẫu đã có công thức và đủ đơn giá; không
 * tra được giá vốn thì không chặn (không đoán số). Pure TypeScript.
 */

import { formatCurrency } from "@/lib/i18n/formatters"

export function floorPriceVnd(costVnd: number, floorRatio: number): number {
  if (!(costVnd > 0) || !(floorRatio > 0)) return 0
  return Math.ceil((costVnd * floorRatio) / 1000) * 1000
}

/** Thông điệp chặn khi tổng (tiền hàng, chưa gồm phí giao/VAT) thấp hơn sàn; `null` khi hợp lệ. */
export function belowFloorMessage(totalVnd: number, floorVnd: number): string | null {
  if (!(floorVnd > 0) || totalVnd >= floorVnd) return null
  return `Giá ${formatCurrency(totalVnd)} thấp hơn giá sàn ${formatCurrency(floorVnd)} — cần Điều hành duyệt`
}

/**
 * Giá trần của một mẫu = giá vốn × hệ số Trần (`floor_ceiling_ratio.ceilingRatio`), làm tròn XUỐNG nghìn — giá trần
 * không bao giờ cao hơn thật (PO 07/11/2026, Q3: mã C9 chặn thật).
 */
export function ceilingPriceVnd(costVnd: number, ceilingRatio: number): number {
  if (!(costVnd > 0) || !(ceilingRatio > 0)) return 0
  return Math.floor((costVnd * ceilingRatio) / 1000) * 1000
}

/** Thông điệp chặn khi tiền hàng của các mẫu có giá vốn vượt trần; `null` khi hợp lệ hoặc không có trần. */
export function aboveCeilingMessage(totalVnd: number, ceilingVnd: number): string | null {
  if (!(ceilingVnd > 0) || totalVnd <= ceilingVnd) return null
  return `Giá ${formatCurrency(totalVnd)} cao hơn giá trần ${formatCurrency(ceilingVnd)} — cần người có quyền đặt giá vượt trần duyệt`
}
