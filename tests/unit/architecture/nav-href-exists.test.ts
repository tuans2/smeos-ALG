import { describe, expect, it } from "vitest"

import {
  CHAIN_NAV_ENTRIES,
  HOME_ENTRY,
  INDUSTRY_NAV_ENTRIES,
  MOTHER_NAV_ENTRIES,
  STORE_NAV_ENTRIES,
  integrationsEntry,
} from "@/components/layout/nav"
import { activeDeliveryPhase, builtInDeliveryPhase, filterByPhase } from "@/lib/delivery/delivery-phase"
import { getAllTools } from "@/modules/toolkit/domain/toolkit-catalog"
import { pageExists as exists } from "../../helpers/page-routes"

/**
 * UJ-05 (audit hành trình 06/11/2026, N1): mục menu "Trợ lý tối ưu" (`/cong-cu/toi-uu-he-thong`) và
 * "Catalog toàn hệ thống" (`/van-hanh/san-pham`) dẫn tới trang không tồn tại (404). Mọi đường dẫn mà giao
 * diện đưa người dùng tới — menu bốn tầng, thẻ trong danh mục công cụ — phải khớp một `page.tsx` thật.
 * Gợi ý bước tiếp theo: `nav-href-exists-next-actions.test.ts`.
 *
 * Lọc theo giai đoạn bàn giao như giao diện (`withDeliveryPhase`, `getAllTools`): ở smeOS không bật giai đoạn
 * thì kiểm mọi mục; ở bản cắt (giai đoạn gắn sẵn) chỉ kiểm mục còn hiện — mục trỏ tới trang đã cắt bị ẩn.
 * `tests/setup.ts` tắt chế độ cho unit test, nên ở đây lấy thẳng giai đoạn gắn sẵn.
 */
const phase = activeDeliveryPhase() ?? builtInDeliveryPhase()

describe("đường dẫn điều hướng đều trỏ tới trang có thật", () => {
  it("tìm thấy trang để đối chiếu (bộ dò route không rỗng)", () => {
    expect(exists("/")).toBe(true)
    expect(exists("/don-hang")).toBe(true)
    expect(exists("/khong-co-trang-nay")).toBe(false)
  })

  it("menu bốn tầng", () => {
    const entries = filterByPhase(
      [
        HOME_ENTRY,
        ...MOTHER_NAV_ENTRIES,
        ...INDUSTRY_NAV_ENTRIES,
        ...CHAIN_NAV_ENTRIES,
        ...STORE_NAV_ENTRIES,
        integrationsEntry("MOTHER", "x"),
        integrationsEntry("STORE", "x"),
      ],
      (entry) => entry.href,
      phase,
    )
    const broken = entries.filter((e) => !exists(e.href)).map((e) => `${e.label} → ${e.href}`)
    expect(broken).toEqual([])
  })

  it("thẻ công cụ bấm được trong danh mục công cụ", () => {
    const broken = filterByPhase(getAllTools(), (t) => t.href, phase)
      .filter((t) => t.href !== null && !exists(t.href))
      .map((t) => `${t.name} → ${t.href}`)
    expect(broken).toEqual([])
  })
})
