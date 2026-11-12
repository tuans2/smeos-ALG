import { asSystemDb } from "@/core/tenancy/db-context"
import type { NextRequest } from "next/server"
import { publicChatWidgetBody } from "@/app/api/v1/_contracts/requests-chat"
import { AppError } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { log } from "@/core/observability/log"
import { PUBLIC_CHAT_SURFACES } from "@/modules/chat-assistant/domain/public-chat-policy"
import {
  defaultPublicWidgetDeps,
  handlePublicWidgetMessage,
} from "@/modules/chat-assistant/use-cases/handle-public-widget-message"

/**
 * Khung chat AI trên trang công khai do công cụ SMEOS tạo (tổ chức suy từ slug).
 * Chỉ phục vụ cùng nguồn gốc — chưa mở CORS cho website ngoài (giai đoạn sau).
 */

const PUBLIC_MESSAGES: Partial<Record<string, string>> = {
  NOT_FOUND: "Không tìm thấy cửa hàng",
  RATE_LIMITED: "Bạn gửi tin nhắn hơi nhanh, vui lòng thử lại sau ít phút",
}

/** Webhook / widget công khai ngoài `handle()`: chạy quyền hệ thống (tổ chức suy từ kênh), như nhóm đường dẫn của `handle()`. */
export async function POST(req: NextRequest) {
  return asSystemDb("route:/api/v1/chat/public/widget", () => postUnscoped(req))
}

async function postUnscoped(req: NextRequest) {
  const parsed = publicChatWidgetBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return jsonResponse({ error: { code: "VALIDATION_FAILED", message: "Tham số không hợp lệ" } }, { status: 400 })
  }

  try {
    const deps = defaultPublicWidgetDeps((rule) => enforceRateLimit(req, rule))
    const result = await handlePublicWidgetMessage(parsed.data, deps)
    return jsonResponse({ data: result })
  } catch (error: unknown) {
    if (error instanceof AppError && PUBLIC_MESSAGES[error.code]) {
      return jsonResponse({ error: { code: error.code, message: PUBLIC_MESSAGES[error.code] } }, { status: error.status })
    }
    // Không trả chi tiết lỗi nội bộ cho khách
    log.error("public_chat_widget.failed", {
      feature: "public-chat",
      message: error instanceof Error ? error.message : String(error),
    })
    return jsonResponse({ error: { code: "INTERNAL", message: "Trợ lý tạm thời gián đoạn, vui lòng thử lại sau" } }, { status: 500 })
  }
}
