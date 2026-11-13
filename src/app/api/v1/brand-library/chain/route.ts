import { jsonResponse } from "@/core/http/response"
import { listChainBrandLibrary } from "@/modules/profiles/use-cases/brand-library"
import { defineRoute } from "@/core/http/define-route"

/** Cửa hàng thành viên: tài nguyên chuỗi đã chia sẻ (chỉ đọc). `data: null` khi không thuộc chuỗi. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await listChainBrandLibrary(ctx) })
  },
})
