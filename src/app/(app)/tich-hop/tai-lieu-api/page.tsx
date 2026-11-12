import { headers } from "next/headers"

import { hasCapability } from "@/core/rbac/capabilities"
import { log } from "@/core/observability/log"
import { withRequestDb } from "@/core/tenancy/db-context"
import { PartnerApiDocs } from "@/components/integrations/api-docs/partner-api-docs"
import { EntitlementGate } from "@/components/ui/entitlement-gate"
import { PageHeader } from "@/components/ui/page-header"
import { requestCookieHeader } from "@/lib/request-cookie-header"
import { INTEGRATION_FIELD_SUNSET } from "@/modules/integration/domain/integration-field-sunset"
import { partnerApiReference } from "@/modules/integration/use-cases/partner-api-reference"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"

/**
 * Tài liệu API cho đối tác (SCR-STORE-tich-hop-tai-lieu-api, ARC-024 B5, PO 11/11/2026): chỉ người đã đăng nhập và có
 * quyền quản lý khoá ứng dụng (`F9`, cùng quyền cấp khoá) mới xem — tài liệu không công khai (PO Q1).
 * Chỉ Integration API; nội dung sinh từ OpenAPI của mã (`partnerApiReference`).
 */
async function canManageAppKeys(): Promise<boolean> {
  const cookieHeader = await requestCookieHeader()
  const host = (await headers()).get("host") ?? "localhost"
  try {
    const request = new Request(`http://${host}/tich-hop/tai-lieu-api`, { headers: { cookie: cookieHeader } })
    return await withRequestDb("/tich-hop/tai-lieu-api", async () => {
      const { ctx } = await requireTenantContext(request)
      return hasCapability(ctx, "F9")
    })
  } catch (error) {
    log.warn("integration_docs.access_check_failed", { error: error instanceof Error ? error.message : String(error) })
    return false
  }
}

export default async function PartnerApiDocsPage() {
  const allowed = await canManageAppKeys()
  const effective = INTEGRATION_FIELD_SUNSET.effective.split("-").reverse().join("/")
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
      <PageHeader
        title="Tài liệu API cho đối tác"
        description="Cách ứng dụng bên ngoài đọc sản phẩm, hồ sơ và gửi việc cho cửa hàng."
        backHref="/tich-hop"
        backLabel="Trung tâm Tích hợp"
      />
      <EntitlementGate allowed={allowed} reason="Tài khoản của bạn chưa được quản lý khoá ứng dụng, nên chưa xem được tài liệu API.">
        <div role="note" className="rounded-xl border border-warning-border bg-warning-bg p-4 text-body-sm text-warning-text">
          Từ {effective}: máy chủ bỏ các trường gắn nhãn &quot;Sắp gỡ&quot;, và gửi lại cùng khoá chống trùng với nội dung khác sẽ bị từ chối. Xem mục Thay đổi và gỡ bỏ.
        </div>
        <PartnerApiDocs reference={partnerApiReference()} />
      </EntitlementGate>
    </div>
  )
}
