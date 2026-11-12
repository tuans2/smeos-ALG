import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { publicAppUrl } from "@/lib/public-url"

/** Mọi biến `publicAppUrl` đọc — ca thử phải tự đặt hết, không để `.env` của máy quyết. */
const BIEN_DOC = ["PUBLIC_APP_URL", "NEXT_PUBLIC_APP_URL", "RENDER_EXTERNAL_URL", "VERCEL_URL", "PORT"] as const

describe("publicAppUrl — gốc URL cho ảnh xem trước link và link trong tin nhắn", () => {
  // `tests/setup.ts` nạp `.env` khi chạy tại máy. README của bản giao dặn
  // `cp .env.example .env`, và mẫu đó khai `NEXT_PUBLIC_APP_URL`, nên hai ca
  // "chưa cấu hình" bên dưới từng đỏ ở máy dev mà vẫn xanh trên CI (phát hiện
  // ở Bước 6 bàn giao GD1, 11/11/2026). Dọn sạch trước mỗi ca là cách chặn.
  beforeEach(() => {
    for (const bien of BIEN_DOC) vi.stubEnv(bien, "")
  })

  afterEach(() => vi.unstubAllEnvs())

  it("ưu tiên PUBLIC_APP_URL, bỏ dấu / cuối", () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://shop.example.vn/")
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://x.onrender.com")
    expect(publicAppUrl()).toBe("https://shop.example.vn")
  })

  it("rơi về RENDER_EXTERNAL_URL khi chưa cấu hình", () => {
    vi.stubEnv("PUBLIC_APP_URL", "")
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://x.onrender.com")
    expect(publicAppUrl()).toBe("https://x.onrender.com")
  })

  it("rỗng khi chạy local chưa cấu hình", () => {
    vi.stubEnv("PUBLIC_APP_URL", "")
    vi.stubEnv("RENDER_EXTERNAL_URL", "")
    expect(publicAppUrl()).toBe("")
  })

  it("dev chưa cấu hình: rơi về cổng của `npm run dev` (3200)", () => {
    vi.stubEnv("NODE_ENV", "development")
    expect(publicAppUrl()).toBe("http://localhost:3200")
  })
})
