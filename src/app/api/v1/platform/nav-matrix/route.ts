import { handle, jsonResponse } from "@/core/http/response"
import { log } from "@/core/observability/log"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { listAllIndustryPlugins } from "@/modules/organization/domain/industry-profile"
import { NAV_ENTRIES, HOME_ENTRY, NAV_GROUP_CONFIG } from "@/components/layout/nav-model"
import {
  getPlatformNavMatrixOverrides,
  savePlatformNavMatrixOverrides,
} from "@/modules/platform/infra/nav-matrix-store"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { navMatrixBody } from "@/app/api/v1/platform/_contracts/requests"

export const GET = handle(async (request) => {
  await requirePlatformContext(request)

  const plugins = listAllIndustryPlugins()
  const industries = plugins.map((p) => ({
    key: p.identity.key,
    name: p.identity.name,
    iconName: p.identity.iconName,
    description: p.identity.description,
  }))

  const defaultMatrix: Record<string, string[]> = {}
  for (const p of plugins) {
    defaultMatrix[p.identity.key] = [...p.navigation.hiddenNavKeys]
  }

  const allNavItems = [
    {
      navKey: HOME_ENTRY.navKey,
      label: HOME_ENTRY.label,
      group: HOME_ENTRY.group,
      href: HOME_ENTRY.href,
      iconKey: HOME_ENTRY.iconKey,
    },
    ...NAV_ENTRIES.map((entry) => ({
      navKey: entry.navKey,
      label: entry.label,
      group: entry.group,
      href: entry.href,
      iconKey: entry.iconKey,
    })),
  ]

  const activeOverrides = await getPlatformNavMatrixOverrides()

  return jsonResponse({
    data: {
      industries,
      groups: NAV_GROUP_CONFIG,
      navItems: allNavItems,
      defaultMatrix,
      activeOverrides,
    },
  })
})

export const PUT = handle(async (request) => {
  const pctx = await requirePlatformContext(request)
  // Đổi điều hướng của MỌI tổ chức trong ngành — cần mã quản trị cấu hình, không chỉ phiên nền tảng
  requirePlatformCapability(pctx, "N12")
  const rawBody = (await request.json()) as unknown
  const parsed = navMatrixBody.parse(rawBody)

  const previousOverrides = await getPlatformNavMatrixOverrides()
  const savedOverrides = await savePlatformNavMatrixOverrides(parsed.overrides, pctx.userId)

  try {
    await recordPlatformAuditLog(pctx, {
      action: "platform.industry_nav_matrix.update",
      entityType: "INDUSTRY_NAV_MATRIX",
      entityId: "PLATFORM_GLOBAL",
      before: previousOverrides,
      after: savedOverrides,
    })
  } catch (error) {
    // Không làm gián đoạn việc lưu nếu audit log ghi lỗi — nhưng phải để lại dấu vết: thay đổi cấu hình
    // toàn sàn không có dòng audit là lỗ hổng truy vết (audit API-17, 07/11/2026).
    log.error("platform.audit_write_failed", {
      action: "platform.industry_nav_matrix.update",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return jsonResponse({
    data: {
      ok: true,
      activeOverrides: savedOverrides,
    },
  })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
