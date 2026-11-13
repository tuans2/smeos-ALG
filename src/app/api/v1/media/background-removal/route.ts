import { AppError } from "@/core/http/errors"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /api/v1/media/background-removal` — **đã đóng ở P24**.
 *
 * Endpoint này từng là đường chạy của M04b. Nó có bốn lỗ, mỗi lỗ đủ để chặn
 * go-live, và cả bốn cùng nằm trên một đường vì đường đó đi vòng qua kiến
 * trúc job:
 *
 * 1. Không `requireTenantContext`, không `requireCapability` — bất kỳ ai gọi
 *    được URL đều chạy được mô hình AI, không cần đăng nhập.
 * 2. Không `organization_id` — kết quả không thuộc về tiệm nào.
 * 3. Không `enqueueJob` — không trừ credit, không vào sổ `usage`, không
 *    `Idempotency-Key`.
 * 4. `spawn` Python rồi đọc stdout ngay trong tiến trình web, và tập lệnh đó
 *    nhận `image_url` tuỳ ý rồi tự `urlopen` — tức là máy chủ đi lấy bất kỳ
 *    địa chỉ nào người gọi đưa (SSRF).
 *
 * Luật ở `AGENTS.md` nói thẳng: *"Worker Python lấy việc bằng `SELECT … FOR
 * UPDATE SKIP LOCKED` + `LISTEN/NOTIFY`. Cấm `subprocess` + parse stdout.
 * Cấm chạy job qua HTTP."*
 *
 * Đường thay thế: `POST /api/v1/media/variants` (`I4`).
 *
 * Giữ lại tệp thay vì xoá lặng: bản dựng cũ của giao diện và mọi thứ đã trỏ
 * tới URL này cần một câu trả lời đọc được, chứ không phải một trang 404 để
 * người ta ngồi đoán.
 */
export const POST = defineRoute({
  auth: { kind: "custom", reason: "endpoint đã đóng — luôn trả 409, không đọc dữ liệu" },
  handler: async ({  }) => {
    throw new AppError(
      "CONFLICT",
      "Endpoint đã đóng. Dùng POST /api/v1/media/variants (năng lực I4) — biến thể marketing nay chạy qua hàng đợi job, có tổ chức, có credit và có cổng duyệt."
    )
  },
})
