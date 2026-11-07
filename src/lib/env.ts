import { z } from "zod"

/**
 * Cấu hình kiểm lúc khởi động. Thiếu biến thì tiến trình không lên —
 * chạy tiếp với giá trị mặc định âm thầm là cách hỏng khó tìm nhất.
 */

/**
 * Helper: chuyển empty string "" thành undefined trước khi validate URL.
 * Cần thiết khi deploy trên Render/Vercel — platform có thể set env var
 * thành "" thay vì bỏ trống, khiến z.string().url() reject dù là optional.
 */
const optionalUrl = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.string().url().optional()
)

const schema = z.object({
  DATABASE_URL: z.string().url(),
  // Số kết nối tối đa của pool web (ADR-015 D-O5). Tổng mọi dịch vụ phải ≤ 70% giới hạn kết nối của gói
  // CSDL — bảng ngân sách ở docs/kien-truc/VAN_HANH_SU_CO_VA_SAO_LUU.md. Thiếu = 10.
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  // Row Level Security theo tổ chức (ADR-013, checklist ALG 1.18): off = không đặt ngữ cảnh; audit = đặt
  // `app.org_id` cho từng kết nối và ghi log truy vấn lẽ ra bị chặn; enforce = CSDL chặn truy vấn sai tổ chức.
  DB_RLS_MODE: z.enum(["off", "audit", "enforce"]).default("off"),
  SESSION_SECRET: z.string().min(16),
  // P7 — khoá ký token máy gọi máy (YC-T8). Tách khỏi SESSION_SECRET: xoay
  // khoá của người dùng và của engine ngoài là hai việc vận hành độc lập,
  // dùng chung một khoá sẽ buộc xoay cả hai cùng lúc mỗi khi chỉ một phía
  // cần xoay.
  INTEGRATION_TOKEN_SECRET: z.string().min(16),
  // Unified Shell (B1) — khoá ký JWT phiên liên-app đọc được bởi LocalBudd
  // (Node) và SocialFlow (Python), xác minh tại chỗ không cần gọi lại CSDL
  // floraos-core mỗi request. Tách khỏi SESSION_SECRET/INTEGRATION_TOKEN_SECRET
  // cùng lý do đã ghi ở INTEGRATION_TOKEN_SECRET — ba khoá, ba vòng đời xoay
  // độc lập.
  SSO_SESSION_SECRET: z.string().min(16),
  // ADR-014 P-5a: khoá chủ mã hoá cột dữ liệu cá nhân (32 byte base64). Thiếu ở production → chưa mã hoá (P-5a, có
  // cảnh báo); ngoài production dẫn xuất khoá thử từ SESSION_SECRET. Đọc ở `src/core/security/pii-cipher.ts`.
  PII_ENCRYPTION_KEY: z.string().optional(),
  // Khoá ký URL kho tệp (`/api/v1/storage/...`, SDAGF D-07). Tách khỏi
  // SESSION_SECRET để xoay độc lập; thiếu thì lùi về SESSION_SECRET.
  STORAGE_SIGNING_SECRET: z.string().min(16).optional(),
  // Xoá payload trên kho khi xoá vĩnh viễn asset (SDAGF P1-3). Chỉ bật
  // ("enabled") sau khi kho đã có bản sao lưu (D-06); thiếu = tắt.
  STORAGE_DELETE_PAYLOADS: z.enum(["enabled", "disabled"]).optional(),
  OPENAI_API_KEY: z.string().optional(),
  // Khoá webhook SePay của tài khoản nhận tiền thuê bao nền tảng (checklist ALG 10.7). Thiếu thì
  // đối soát tự động tắt; Console vẫn xác nhận tay được.
  SEPAY_PLATFORM_API_KEY: z.string().min(16).optional(),
  // Nhà cung cấp nội dung tương đương OpenAI (PO 25/09/2026) — thiếu khoá thì
  // bên đó bị bỏ qua trong chuỗi lùi, không làm hỏng khởi động.
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  // Proxy sang engine ngoài (P15+). Ba app ba cổng theo bảng cổng cục bộ đã chốt
  // 2026-09-10 (core 3100 / LocalBudd 3000 / SocialFlow 8000). Dashboard core
  // gọi sibling qua proxy server-side để tránh rào cản CORS trình duyệt — xem
  // `src/modules/proxy/`. Trống khi không chạy engine ngoài (vd. test đơn lẻ).
  SOCIALFLOW_URL: optionalUrl,
  LOCALBUDD_URL: optionalUrl,
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  /** "true" = cho production chạy bằng đĩa cục bộ (chỉ CI / máy thử) — xem modules/assets/domain/storage-config.ts. */
  ALLOW_LOCAL_STORAGE: z.enum(["true", "false"]).optional(),
  // Redis dùng chung (giới hạn tần suất endpoint công khai). Trống → đếm
  // trong bộ nhớ từng instance (chỉ phù hợp dev/một instance).
  REDIS_URL: optionalUrl,
  // Số proxy tin cậy trước app để lấy IP thật từ x-forwarded-for (Render = 1, thêm CDN = 2)
  RATE_LIMIT_TRUSTED_PROXY_HOPS: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(1).max(5).optional()),
  // URL công khai cho link theo dõi đơn trong tin nhắn khách (fallback RENDER_EXTERNAL_URL)
  PUBLIC_APP_URL: optionalUrl,
  // Tên miền riêng của cửa hàng (checklist ALG 10.8, PO Q11): khoá API Render + mã dịch vụ web để tự gắn tên miền
  // và cấp chứng chỉ HTTPS. Trống → cửa hàng vẫn xác minh được, vận hành thêm tên miền tay trên Render.
  RENDER_API_KEY: z.string().optional(),
  RENDER_SERVICE_ID: z.string().optional(),
  // Máy chủ cửa hàng trỏ CNAME về (vd smeos-web.onrender.com). Trống → lấy từ RENDER_EXTERNAL_URL.
  CUSTOM_DOMAIN_TARGET: z.string().optional(),
  // === FEATURE FLAGS ===
  // Thẻ chào / Swipe Brochure (§34.16). Mặc định bật (“true”) — đặt "false"
  // để tắt module mà không cần xóa code hay deploy lại.
  GREETING_CARD_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false")
    .default(true),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const thieu = parsed.error.issues.map((i) => i.path.join(".")).join(", ")
  throw new Error(`Cấu hình thiếu hoặc sai: ${thieu}. Xem .env.example.`)
}

export const env = parsed.data
