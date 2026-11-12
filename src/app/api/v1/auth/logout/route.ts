import { serializeClearedLegacyCookies, serializeClearedSessionCookie, serializeClearedSsoCookie } from "@/core/http/cookies"
import { handle, jsonResponse } from "@/core/http/response"
import { logOut } from "@/modules/organization/use-cases/log-out"
import { sessionTokenFrom } from "@/modules/organization/use-cases/resolve-session"

export const POST = handle(async (request) => {
  await logOut(sessionTokenFrom(request))
  // B1 (Unified Shell) — xoá cả hai cookie trên trình duyệt. Nhắc lại giới
  // hạn đã biết: một JWT liên-app đã phát hành ra ngoài trước lúc đăng xuất
  // (vd một tab khác, hoặc bị sao chép) vẫn còn hiệu lực tới khi tự hết hạn
  // (tối đa 15 phút) — JWT không thu hồi được giữa chừng như session gốc.
  return jsonResponse(
    { ok: true },
    {
      headers: {
        "set-cookie": [serializeClearedSessionCookie(), serializeClearedSsoCookie(), ...serializeClearedLegacyCookies()],
      },
    }
  )
})
