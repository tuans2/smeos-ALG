import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { Camera } from "@/components/ui/icon-set/camera"
import { EmptyState } from "../empty-state"
import { PageHeader } from "../page-header"

describe("component dùng chung — phong cách thoáng (§6)", () => {
  it("EmptyState hiện icon trong ô lớn, icon trang trí ẩn khỏi trình đọc màn hình", () => {
    const html = renderToStaticMarkup(<EmptyState title="Chưa có đơn" icon={Camera} />)
    expect(html).toContain("h-12 w-12")
    expect(html).toContain('aria-hidden="true"')
  })

  it("PageHeader đặt giải thích trong dấu ? và không hiện giải thích thẳng", () => {
    const html = renderToStaticMarkup(<PageHeader title="Đơn hàng" tip="Theo dõi đơn từ lúc chốt đến khi giao." />)
    expect(html).toContain('aria-label="Giải thích: Đơn hàng"')
    expect(html).not.toContain("Theo dõi đơn từ lúc chốt")
  })
})

import { StatTile } from "../stat-tile"

describe("StatTile (§6.6)", () => {
  it("con số to, giải thích nằm trong ? chứ không hiện thẳng", () => {
    const html = renderToStaticMarkup(<StatTile label="Doanh thu" value="12,4 tr" tip="Tổng đơn đã thanh toán trong kỳ." />)
    expect(html).toContain("text-display")
    expect(html).toContain('aria-label="Giải thích: Doanh thu"')
    expect(html).not.toContain("Tổng đơn đã thanh toán")
  })
})
