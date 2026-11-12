import { INTEGRATION_FIELD_SUNSET } from "@/modules/integration/domain/integration-field-sunset"
import { INTEGRATION_RATE_LIMIT } from "@/modules/integration/domain/integration-rate-limit"
import { DEFAULT_TOKEN_TTL_DAYS, MAX_TOKEN_TTL_DAYS, MIN_TOKEN_TTL_DAYS } from "@/modules/integration/domain/token-rules"
import { SSO_TOKEN_TTL_SECONDS } from "@/modules/sso/domain/sso-claims"

/**
 * Hướng dẫn dùng Integration API cho đối tác (ARC-024 B3, PO 11/11/2026). Dữ liệu thuần — trang
 * `/tich-hop/tai-lieu-api` hiển thị. Con số (giới hạn, ngày thay đổi, thời hạn khoá) lấy từ hằng số trong mã để
 * không lệch; danh sách endpoint/trường KHÔNG viết ở đây mà sinh từ OpenAPI (`partner-api-reference.ts`).
 */
export interface GuideSection {
  id: string
  title: string
  paragraphs: string[]
  code?: string
  /** Bảng hai cột (nhãn → giải thích). */
  rows?: [string, string][]
}

const vnDate = (iso: string) => iso.split("-").reverse().join("/")
const EFFECTIVE = vnDate(INTEGRATION_FIELD_SUNSET.effective)
const ANNOUNCED = vnDate(INTEGRATION_FIELD_SUNSET.announced)

export const PARTNER_GUIDE: GuideSection[] = [
  {
    id: "bat-dau",
    title: "Bắt đầu nhanh",
    paragraphs: [
      "Vào Trung tâm Tích hợp → Khoá ứng dụng, cấp khoá cho ứng dụng cần nối. Khoá chỉ hiện một lần — chép ngay và cất ở nơi an toàn phía máy chủ của ứng dụng, không đưa vào mã chạy trên trình duyệt.",
      "Mọi đường dẫn nằm dưới /api/v1 trên tên miền SMEOS của cửa hàng. Gọi thử bằng lệnh dưới đây:",
    ],
    code: 'curl -H "Authorization: Bearer <khoá ứng dụng>" \\\n  "https://<tên miền SMEOS>/api/v1/integration/products?limit=10"',
  },
  {
    id: "xac-thuc",
    title: "Xác thực",
    paragraphs: [
      `Khoá ứng dụng gửi trong header Authorization: Bearer. Thời hạn mặc định ${DEFAULT_TOKEN_TTL_DAYS} ngày (chọn được ${MIN_TOKEN_TTL_DAYS}–${MAX_TOKEN_TTL_DAYS} ngày). "Đổi khoá" cấp khoá mới cùng thời hạn và giữ khoá cũ còn hiệu lực để chuyển dần; thu hồi khoá cũ khi ứng dụng đã dùng khoá mới.`,
      `Ứng dụng chạy thay mặt người dùng đang đăng nhập có thể gửi phiên SSO trong header x-smeos-sso (hạn ${SSO_TOKEN_TTL_SECONDS / 60} phút).`,
      "Cửa hàng luôn được xác định từ khoá hoặc phiên — không gửi organization_id. Dữ liệu của cửa hàng khác trả 404 như không tồn tại.",
    ],
  },
  {
    id: "gioi-han",
    title: "Giới hạn tần suất",
    paragraphs: [
      `Tối đa ${INTEGRATION_RATE_LIMIT.limit} lần gọi mỗi ${INTEGRATION_RATE_LIMIT.windowMs / 1000} giây cho mỗi khoá (phiên SSO: mỗi người dùng trong một cửa hàng). Mọi phản hồi kèm RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset; vượt giới hạn trả 429 kèm Retry-After (số giây cần chờ).`,
    ],
  },
  {
    id: "chong-trung",
    title: "Chống gửi trùng",
    paragraphs: [
      "POST /integration/jobs bắt buộc idempotency_key trong thân. Gửi lại cùng khoá với cùng nội dung trả job đã tạo (HTTP 200, deduped: true) và không trừ credit lần hai — an toàn để thử lại khi mạng lỗi.",
      `Từ ${EFFECTIVE}: gửi lại cùng khoá với nội dung KHÁC trả 422 IDEMPOTENCY_KEY_REUSED, không tạo job. Mỗi yêu cầu mới dùng một khoá mới.`,
    ],
  },
  {
    id: "loi",
    title: "Lỗi",
    paragraphs: ["Mọi lỗi cùng một dạng; đọc error.code để xử lý, error.message là câu tiếng Việt hiển thị được."],
    code: '{ "error": { "code": "VALIDATION_FAILED", "message": "Dữ liệu gửi lên không hợp lệ", "details": { } } }',
    rows: [
      ["400 VALIDATION_FAILED", "Thân hoặc tham số sai; details.issues chỉ ra trường sai"],
      ["401 UNAUTHENTICATED", "Thiếu khoá, khoá sai, hết hạn hoặc đã thu hồi"],
      ["403", "Khoá không đủ quyền cho thao tác này"],
      ["404 NOT_FOUND", "Không có, hoặc thuộc cửa hàng khác"],
      ["413 PAYLOAD_TOO_LARGE", "Thân JSON quá 2 MB"],
      ["422", "Hết credit (QUOTA_EXCEEDED) hoặc dùng lại khoá chống trùng (IDEMPOTENCY_KEY_REUSED)"],
      ["429 RATE_LIMITED", "Vượt giới hạn tần suất — chờ theo Retry-After"],
      ["500 INTERNAL", "Lỗi máy chủ — thử lại sau; báo kèm header x-request-id"],
    ],
  },
  {
    id: "phan-trang",
    title: "Phân trang",
    paragraphs: [
      "Danh sách trả { data, next_cursor }. Gửi lại next_cursor trong tham số cursor để lấy trang sau; next_cursor rỗng là hết. limit từ 1 đến 100. Không tự dựng hay sửa cursor.",
    ],
  },
  {
    id: "thay-doi",
    title: "Thay đổi và gỡ bỏ",
    paragraphs: [
      "Thay đổi phá vỡ (đổi/xoá trường, siết kiểm tra, đổi mã lỗi) được báo trước ít nhất 90 ngày. Endpoint sắp gỡ trả header Deprecation, Sunset và Link tới bản thay thế. Trường mới, giá trị danh mục mới có thể thêm bất kỳ lúc nào — ứng dụng cần bỏ qua trường lạ.",
      `Trường gắn nhãn "Sắp gỡ" trong phần Tham chiếu sẽ bị máy chủ bỏ khỏi phản hồi từ ${EFFECTIVE}. Ảnh: dùng url (đã ký sẵn) thay cho storage_key.`,
    ],
    rows: [
      [ANNOUNCED, `Báo trước: từ ${EFFECTIVE} bỏ các trường nội bộ khỏi phản hồi và trả 422 khi dùng lại khoá chống trùng với nội dung khác`],
      [EFFECTIVE, "Hai thay đổi trên có hiệu lực từ 00:00 UTC"],
    ],
  },
]
