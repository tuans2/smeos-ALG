/**
 * GET /api/v1/noi-bo/identity
 *
 * Trả về thông tin định danh công khai của tổ chức đang đăng nhập:
 * - Mã ID tổ chức (slug / UUID rút gọn)
 * - Tên hiển thị, loại tổ chức
 * - Danh sách chuỗi mà tổ chức này là thành viên (organization_links, cạnh chuỗi ACTIVE)
 * - Mã đối tác trong chuỗi (nếu có)
 * Mục đích: Hiển thị trên profile kết nối, dùng để mời/liên kết chuỗi.
 *
 * Lỗi đi qua `handle()` (audit API-04): trước đây `try/catch` bọc cả `requireTenantContext`, nên
 * chưa đăng nhập / phiên bị thay trả 500 `IDENTITY_ERROR` thay vì 401, và lỗi máy chủ không tới
 * error tracker. `handle()` vẫn không trả chi tiết/stack ra client.
 *
 * Gác `F1` (audit API §31, 11/11/2026): phản hồi có tên + email thành viên — cùng dữ liệu với
 * `GET /members` (`F1`); trước đây mọi vai, kể cả Shipper, đều đọc được.
 */

import { notFound } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { getOrganizationIdentity } from "@/modules/organization/infra/identity-query"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    const identityData = await getOrganizationIdentity(ctx.organizationId)
    if (!identityData) throw notFound()

    return jsonResponse({ data: identityData })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
