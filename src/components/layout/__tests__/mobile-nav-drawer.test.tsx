import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Đợt 4 — ngăn kéo điều hướng di động. Dự án chạy test ở môi trường node (không jsdom) nên kiểm mã nguồn.
const read = (f: string) => readFileSync(join(process.cwd(), "src/components/layout", f), "utf8")

describe("MobileNavDrawer — truy cập bàn phím", () => {
  const drawer = read("mobile-nav-drawer.tsx")
  const header = read("desktop-nav-header.tsx")

  it("lớp nền mờ không giả làm nút (lint R18): ẩn khỏi cây truy cập, không nhận tiêu điểm", () => {
    expect(drawer).not.toMatch(/role="button"/)
    expect(drawer).toMatch(/aria-hidden="true"\s+onClick=\{close\}/)
  })

  it("mở menu đưa tiêu điểm vào đúng nút Đóng của ngăn kéo (trước đây bộ chọn không khớp phần tử nào)", () => {
    expect(drawer).toContain('querySelector<HTMLElement>("[data-drawer-close]")?.focus()')
    expect(header).toMatch(/onClick=\{onClose\}\s+data-drawer-close=""/)
  })

  it("Esc vẫn đóng ngăn kéo", () => {
    expect(drawer).toMatch(/e\.key === "Escape"\) setOpenedAt\(null\)/)
  })
})

describe("Bảng chọn vai dev — nút bật/tắt thay cho listbox giả", () => {
  for (const f of ["architecture-nametag.tsx", "superadmin-homepage-badge.tsx"]) {
    it(f, () => {
      const s = read(f)
      expect(s).not.toMatch(/role="(listbox|option)"/)
      expect(s).toContain("aria-pressed={isActive}")
    })
  }
})
