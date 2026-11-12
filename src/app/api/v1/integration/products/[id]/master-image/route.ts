import { jsonResponse } from "@/core/http/response"
import { withoutSunsetFields } from "@/modules/integration/domain/integration-field-sunset"
import {
  toTenantContext,
} from "@/modules/integration/use-cases/resolve-integration-context"
import { getMasterImage } from "@/modules/integration/use-cases/get-master-image"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /integration/products/:id/master-image` (đặc tả 06 mục 11, đặc tả 08
 * mục 4) — chỉ trả Master Image có `approval_state = APPROVED`. Trước khi P9
 * (Identity Guard) xây xong, luôn 404 (nợ #30, `TECHNICAL_DEBT.md`) — đúng
 * luật "ảnh chờ duyệt không rò ra ngoài core", không phải lỗi.
 */
export const GET = defineRoute({
  auth: { kind: "integration" },
  handler: async ({ request, ic, params }) => {
    const ctx = await toTenantContext(ic)

    const { id } = params as { id: string }
    // `origin` lấy từ chính lời gọi, không từ biến môi trường: URL ký sẵn phải
    // trỏ về đúng máy chủ core mà engine ngoài vừa gọi tới, kể cả sau khi Nhóm C
    // dựng proxy và ba app về chung một origin.
    const origin = new URL(request.url).origin
    const image = await getMasterImage(ctx, id, { origin })
    // `storage_key`/`thumb_key` tự bỏ từ 09/02/2027 — đối tác dùng `url` ký sẵn (ARC-024)
    const now = new Date()
    return jsonResponse({
      ...image,
      master: withoutSunsetFields("masterImageAsset", image.master, now),
      ratios: image.ratios.map((ratio) => withoutSunsetFields("masterImageAsset", ratio, now)),
    })
  },
})
