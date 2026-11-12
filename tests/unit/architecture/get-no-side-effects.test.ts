import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * ARC-022 (PO D-25, 11/11/2026): `SameSite=Lax` vẫn gửi cookie khi người dùng bấm một link GET từ trang lạ, nên route
 * `GET` không được đổi trạng thái — bộ kiểm `Origin` (`src/core/http/origin-guard.ts`) chỉ phủ lệnh ghi. Test quét thân
 * `export const GET` tìm lời gọi có tên dạng ghi. Ngoại lệ chỉ là nhật ký truy cập/xuất dữ liệu (ghi lại việc ĐỌC, không
 * đổi dữ liệu nghiệp vụ) và luồng SSE; thêm ngoại lệ phải ghi lý do.
 */
const WRITE_CALL = /\b([A-Za-z_]\w*)\s*\(/g
// Tên lời gọi lấy từ `WRITE_CALL` (chỉ ký tự chữ/số/_), nên chỉ cần khớp tiền tố động từ ghi + chữ hoa tiếp theo
const WRITE_NAME = /^(?:create|update|delete|remove|upsert|increment|save|mark|enqueueJob|revoke|claim|consume|approve|reject|publish|assign|confirm|cancel|set)[A-Z_]/

const ALLOWED: Readonly<Record<string, string>> = {
  recordDataExport: "nhật ký xuất dữ liệu (audit đọc), không đổi dữ liệu nghiệp vụ",
  recordPlatformAccess: "nhật ký truy cập xuyên tổ chức của người vận hành",
  recordPlatformAuditLog: "nhật ký xuất dữ liệu của Console",
  setInterval: "bộ hẹn giờ giữ kết nối của luồng SSE (hàm hệ thống, không chạm dữ liệu)",
  setTimeout: "bộ hẹn giờ của luồng SSE (hàm hệ thống, không chạm dữ liệu)",
  removeEventListener: "gỡ listener khi client đóng luồng SSE (hàm hệ thống)",
}

function routeFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...routeFiles(full))
    else if (entry === "route.ts") out.push(full)
  }
  return out
}

function getBody(source: string): string | null {
  const start = source.search(/export const GET\s*=/)
  if (start < 0) return null
  const rest = source.slice(start + 1)
  const next = rest.search(/\nexport const (POST|PUT|PATCH|DELETE|dynamic|revalidate|runtime)\b/)
  return next < 0 ? rest : rest.slice(0, next)
}

describe("route GET không đổi trạng thái (ARC-022)", () => {
  it("không route GET nào gọi hàm có tên dạng ghi, ngoài nhật ký truy cập đã liệt kê", () => {
    const offenders: string[] = []
    for (const file of routeFiles("src/app/api")) {
      const body = getBody(readFileSync(file, "utf8"))
      if (!body) continue
      for (const [, name] of body.matchAll(WRITE_CALL)) {
        if (name && WRITE_NAME.test(name) && !(name in ALLOWED)) offenders.push(`${file}: ${name}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it("mỗi ngoại lệ có lý do", () => {
    for (const reason of Object.values(ALLOWED)) expect(reason.length).toBeGreaterThan(10)
  })
})
