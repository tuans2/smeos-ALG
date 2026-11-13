import React from "react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { INITIAL_PRODUCT_LIST_URL, useProductList, type ProductListPage } from "../use-product-list"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))

type Row = { id: string; name: string }

function List({ initial }: { initial: ProductListPage<Row> | null }) {
  const { items, total } = useProductList<Row>("", null, null, null, initial)
  if (items === null) return <p>đang tải</p>
  return (
    <ul data-total={total?.count ?? ""}>
      {items.map((r) => (
        <li key={r.id}>{r.name}</li>
      ))}
    </ul>
  )
}

describe("useProductList — trang đầu máy chủ tải sẵn (/san-pham LCP)", () => {
  it("render ngay dữ liệu khởi tạo, không chờ gọi API", () => {
    const html = renderToStaticMarkup(
      <List initial={{ data: [{ id: "a", name: "Bó hoa A" }, { id: "b", name: "Bó hoa B" }], next_cursor: null, total: 2 }} />,
    )
    expect(html).toContain("Bó hoa A")
    expect(html).toContain("Bó hoa B")
    expect(html).toContain('data-total="2"')
    expect(html).not.toContain("đang tải")
  })

  it("không có dữ liệu khởi tạo thì ở trạng thái đang tải như trước", () => {
    expect(renderToStaticMarkup(<List initial={null} />)).toContain("đang tải")
  })

  it("URL trang đầu khớp URL client gọi khi chưa lọc", () => {
    expect(INITIAL_PRODUCT_LIST_URL).toBe("/api/v1/products?limit=100")
  })

  it("trang máy chủ chỉ lấy hằng số/kiểu từ module dùng chung, không từ module \"use client\"", () => {
    // Import giá trị từ tệp "use client" vào server component trả về tham chiếu client, không phải giá trị
    // (lỗi thật: URL trang đầu thành hàm → trang đầu luôn rỗng, LCP không cải thiện).
    const page = readFileSync(join(process.cwd(), "src/app/(app)/san-pham/page.tsx"), "utf8")
    expect(page).not.toMatch(/from "@\/components\/products\/use-product-list"/)
    expect(page).toMatch(/from "@\/components\/products\/product-list-page"/)
    // Chỉ thị "use client" là câu lệnh đầu tệp (bỏ qua chú thích)
    expect(readFileSync(join(process.cwd(), "src/components/products/product-list-page.ts"), "utf8")).not.toMatch(/^\s*["']use client["']/m)
  })
})
