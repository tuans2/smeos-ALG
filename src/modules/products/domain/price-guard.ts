/**
 * Đối soát giá theo Sàn và Trần — thu hoạch R5 phần "chặn giá" từ
 * `FloraOS/floraos-web/src/lib/chanGia.ts` (62 dòng, hạng REUSE, thuần —
 * `HARVEST_MANIFEST.md`). Chỉ đổi tên định danh sang tiếng Anh; luật giữ
 * nguyên V4 của bản gốc — **cảnh báo tham khảo, không chặn cứng**.
 *
 * `sanTran.ts` (bản gốc, 102 dòng) bị xếp REUSE trong `HARVEST_MANIFEST.md`
 * nhưng đọc mã thật thì KHÔNG thuần — nó gọi thẳng một dịch vụ Excel qua
 * `goiDichVu()`/`docHeThong()` (`import 'server-only'`). Phần quyết định duy
 * nhất của nó (`quyetDinhChan`) đã nằm trong `chanGia.ts` rồi; phần còn lại
 * là hạ tầng tra Excel của v1, không mang sang được — phải viết lại thành
 * `PricingRuleRepository` đọc `pricing_rules` (`infra/pricing-rule-repository.ts`).
 * Đây là điểm lệch tài liệu/mã thứ 10, thêm vào `RA_SOAT_THU_HOACH.md`.
 */

import { formatCurrency } from "@/lib/i18n/formatters"

/** Sàn/Trần tra được cho một mã sản phẩm. */
export interface FloorCeilingLookup {
  /** Có tra được hay không — mã chưa có quy tắc giá riêng thì `false`. */
  has: boolean
  floorVnd: number
  ceilingVnd: number
}

export interface PriceGuardResult {
  /** Luôn `false` — V4 không chặn cứng, chỉ ghi vết. Giữ trường này để
   *  không phá vỡ hợp đồng nếu sau này chủ sản phẩm đổi ý sang chặn cứng. */
  blocked: boolean
  belowFloor: boolean
  aboveCeiling: boolean
  warning: string
}

function formatVnd(value: number): string {
  return formatCurrency(Math.round(value))
}

/**
 * Đối soát một mức giá với Sàn/Trần của mã sản phẩm.
 *
 * Không tra được quy tắc, hoặc mã có quy tắc nhưng cả Sàn lẫn Trần đều bằng 0:
 * không có số để đối chiếu, không có gì để cảnh báo.
 */
export function checkPriceGuard(input: {
  code: string
  priceVnd: number
  limits: FloorCeilingLookup
}): PriceGuardResult {
  const { limits } = input
  const priceVnd = Number(input.priceVnd) || 0

  if (!limits.has || (limits.floorVnd === 0 && limits.ceilingVnd === 0)) {
    return { blocked: false, belowFloor: false, aboveCeiling: false, warning: "" }
  }

  const belowFloor = limits.floorVnd > 0 && priceVnd < limits.floorVnd
  const aboveCeiling = limits.ceilingVnd > 0 && priceVnd > limits.ceilingVnd

  let warning = ""
  if (belowFloor) {
    warning =
      `⚠️ Tham khảo: giá ${formatVnd(priceVnd)} thấp hơn Sàn ${formatVnd(limits.floorVnd)} ` +
      `của mã ${input.code}. Điều phối toàn quyền quyết định mức giá này.`
  } else if (aboveCeiling) {
    warning =
      `⚠️ Tham khảo: giá ${formatVnd(priceVnd)} vượt Trần ${formatVnd(limits.ceilingVnd)} ` +
      `của mã ${input.code}. Lãi ít hơn dự kiến ở đơn này.`
  }

  return { blocked: false, belowFloor, aboveCeiling, warning }
}
