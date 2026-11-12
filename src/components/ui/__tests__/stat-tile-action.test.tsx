import * as React from "react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { StatTile } from "../stat-tile"

// Đợt 4 D4-09: thẻ tương tác tự dựng (role="button"/"radio") thay bằng nút/nhóm lựa chọn chuẩn, không lồng nút.
describe("StatTile — hành động riêng", () => {
  it("vẽ nút thật cạnh InfoTip, không bọc cả ô bằng role=button", () => {
    const html = renderToStaticMarkup(
      <StatTile label="Rủi ro trễ hẹn" value={3} tip="giải thích" action={{ label: "Xem đơn rủi ro", onClick: () => {} }} />,
    )
    expect(html).toContain(">Xem đơn rủi ro</button>")
    expect(html).not.toContain('role="button"')
    expect((html.match(/<button/g) ?? []).length).toBe(2) // InfoTip + hành động, ngang hàng
  })
})

describe("không còn vai trò ARIA tự dựng ở 4 thẻ", () => {
  const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8")
  it.each([
    ["src/app/(app)/bo-may/page.tsx", 'role="radio"'],
    ["src/components/dashboard/flower-network-command-center.tsx", 'role="button"'],
    ["src/components/templates/social-publishing/schedule-calendar-card.tsx", 'role="button"'],
    ["src/components/templates/video-studio/video-player-card.tsx", 'role="button"'],
  ])("%s", (file, role) => {
    expect(src(file)).not.toContain(role)
  })
})
