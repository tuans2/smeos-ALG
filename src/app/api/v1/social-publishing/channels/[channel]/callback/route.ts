import { AppError, notFound } from "@/core/http/errors"
import { defineRoute } from "@/core/http/define-route"
import { publicAppUrl } from "@/lib/public-url"
import { isSocialChannel } from "@/modules/social-publishing/domain/post-lifecycle"
import { finishConnect } from "@/modules/social-publishing/use-cases/connect-channel"

/**
 * GET /api/v1/social-publishing/channels/[channel]/callback (W2) — nền tảng chuyển trình duyệt về đây sau khi user đồng ý.
 * Phiên đăng nhập đi kèm (cookie SameSite=Lax cho phép điều hướng GET); `state` mã hoá chống giả mạo. Xong thì đưa user
 * về Bước 4 kèm kết quả — không bao giờ đưa khoá lên URL.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "W2" },
  rateLimit: { scope: "social-channel-callback", limit: 20, windowMs: 60_000, per: "user" },
  handler: async ({ ctx, params, request }) => {
    const channel = params.channel ?? ""
    if (!isSocialChannel(channel)) throw notFound()
    const url = new URL(request.url)
    const back = new URL("/cong-cu", publicAppUrl() || url.origin)
    back.searchParams.set("muc", "content")
    back.searchParams.set("buoc", "dang-tu-dong")
    try {
      const r = await finishConnect(ctx, channel, { code: url.searchParams.get("code"), state: url.searchParams.get("state"), error: url.searchParams.get("error") })
      back.searchParams.set("ket_noi", "pending_pages" in r ? "chon-trang" : "ok")
    } catch (e) {
      back.searchParams.set("ket_noi", "loi")
      back.searchParams.set("ly_do", e instanceof AppError ? e.message.slice(0, 160) : "Nền tảng chưa phản hồi — thử kết nối lại")
    }
    return Response.redirect(back.toString(), 303)
  },
})
