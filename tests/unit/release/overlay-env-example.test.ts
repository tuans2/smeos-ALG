import { readFileSync } from "node:fs"
import path from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * Kế hoạch bàn giao GD1, Bước 6.1: người nhận dựng bản giao từ môi trường trắng
 * CHỈ theo README — `cp .env.example .env` rồi điền ba bí mật bắt buộc.
 *
 * Phát hiện 11/11/2026 khi chạy Bước 6: `.env.example` khai `STORAGE_SIGNING_SECRET=`
 * và `STORAGE_DELETE_PAYLOADS=` với giá trị rỗng. Cả hai là tuỳ chọn trong
 * `src/lib/env.ts`, nhưng chuỗi rỗng KHÔNG phải "không khai": `min(16)` và `enum`
 * cùng trượt, nên `npm run db:seed` và cả app đều không khởi động được. Test này
 * khoá điều kiện ngược lại: mẫu môi trường của bản giao phải nạp được nguyên trạng.
 */
const OVERLAY_ENV_EXAMPLE = path.resolve(__dirname, "../../../releases/gd1/overlay/.env.example")

/** Các biến README yêu cầu người nhận tự điền. */
const DIEN_TAY: Record<string, string> = {
  SESSION_SECRET: "a".repeat(32),
  INTEGRATION_TOKEN_SECRET: "b".repeat(32),
  SSO_SESSION_SECRET: "c".repeat(32),
}

/** Đọc mẫu như dotenv: chỉ dòng `KEY=VALUE` chưa bị ghi chú. */
function docMauMoiTruong(): Record<string, string> {
  const ket_qua: Record<string, string> = {}
  for (const dong of readFileSync(OVERLAY_ENV_EXAMPLE, "utf8").split("\n")) {
    const khop = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(dong.trim())
    if (!khop) continue
    ket_qua[khop[1]!] = khop[2]!.trim().replace(/^"(.*)"$/, "$1")
  }
  return ket_qua
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("mẫu .env của bản giao GD1", () => {
  it("nạp được qua hợp đồng env.ts khi chỉ điền ba bí mật bắt buộc", async () => {
    const mau = { ...docMauMoiTruong(), ...DIEN_TAY }
    for (const bien of Object.keys(process.env)) vi.stubEnv(bien, undefined)
    for (const [bien, gia_tri] of Object.entries(mau)) vi.stubEnv(bien, gia_tri)
    vi.resetModules()

    // Hợp đồng kiểm lúc nạp module: nạp được là đạt, thiếu/sai thì ném ngay tại đây.
    await expect(import("@/lib/env")).resolves.toBeDefined()
  })
})
