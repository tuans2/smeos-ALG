import { existsSync } from "node:fs"

/**
 * Nạp `.env` khi chạy tại máy. Trên CI biến đã nằm sẵn trong môi trường nên
 * không có tệp và cũng không cần — `src/lib/env.ts` vẫn là chỗ duy nhất kiểm
 * cấu hình, và nó vẫn ném khi thiếu biến.
 */
if (existsSync(".env")) process.loadEnvFile(".env")

/**
 * Hai biến của `.env` làm kết quả test phụ thuộc máy (Bước 6 bàn giao GD1: máy dựng theo README đỏ 4 ca mà CI
 * xanh). Ép về đúng giá trị CI dùng: không có `CRON_SECRET` (route cron nhận khoá dev ngoài production), có khoá
 * OpenAI giả (bộ chuyển đổi đòi khoá lúc khởi tạo; mạng đã bị chặn bên dưới). Test cần giá trị khác thì `vi.stubEnv`.
 */
delete process.env.CRON_SECRET
if (!process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = "ci-only-fake-key-network-is-blocked"

/**
 * Chặn mạng thật trong test (24/09/2026). Dòng trên nạp `.env` của máy dev —
 * có khoá thật (Stability, OpenAI, Photoroom…) thì test từng gọi nhà cung cấp
 * thật: tốn credit, chậm, và kết quả phụ thuộc máy (`decoupled-engine.test.ts`
 * xanh ở CI nhưng đỏ trên máy anh Tony vì Stability trả ảnh thật).
 * Test cần `fetch` thì tự mock (`vi.stubGlobal("fetch", …)`); `vi.unstubAllGlobals()`
 * trả về chốt này, không trả về mạng thật.
 */
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  throw new Error(`[tests/setup] Mạng thật bị chặn trong test: ${url} — hãy mock fetch.`)
}) as typeof fetch

/**
 * Bản cắt bàn giao gắn sẵn chế độ giai đoạn (`builtIn` trong `src/lib/delivery/gd1.routes.json`). Unit test mô tả
 * dữ liệu danh mục đầy đủ (menu, công cụ, hành trình) nên mặc định tắt hẳn chế độ; test cần chế độ thì tự
 * `vi.stubEnv`, test đường dẫn điều hướng lọc theo giai đoạn gắn sẵn (`nav-href-exists.test.ts`).
 */
process.env.NEXT_PUBLIC_DELIVERY_PHASE ??= "off"
