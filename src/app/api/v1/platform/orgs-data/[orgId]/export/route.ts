/**
 * GET /api/v1/platform/orgs-data/[orgId]/export
 *
 * Platform Admin: Xuất toàn bộ dữ liệu org dưới dạng ZIP.
 * Bao gồm: tất cả CSV + ảnh sản phẩm.
 *
 * Query params:
 *   ?type=full    (mặc định) — CSV + ảnh
 *   ?type=csv     — chỉ CSV, không ảnh
 *   ?type=images  — chỉ ảnh, không CSV
 *
 * Lưu ý: endpoint này có thể mất vài giây khi tổ chức có nhiều ảnh.
 */

import { NextResponse } from "next/server"
import { handle } from "@/core/http/response"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import { exportOrgDataAsZip } from "@/modules/platform/use-cases/export-org-data-zip"
import {
  exportPlatformOrgRecordsCsv,
  type RecordDomain,
} from "@/modules/platform/use-cases/get-platform-org-records"
import { strToU8, zipSync } from "fflate"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"

export const GET = handle(async (request, { params }) => {
  const pctx = await requirePlatformContext(request)
  // Gác ngay đầu: nhánh CSV nuốt lỗi từng miền nên thiếu N1 từng ra ZIP rỗng thay vì 403.
  requirePlatformCapability(pctx, "N1")
  await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc dữ liệu tổ chức
  const { orgId } = await params

  const url = new URL(request.url)
  const type = url.searchParams.get("type") ?? "full"

  const orgRepo = getOrganizationRepository()
  const org = await orgRepo.findById(orgId as string)
  const orgSlug = org?.slug ?? (orgId as string)
  const safeSlug = orgSlug.replace(/[^a-zA-Z0-9_\-]/g, "_")
  const timestamp = new Date().toISOString().slice(0, 10)

  if (type === "csv") {
    // Chỉ CSV — tạo ZIP nhỏ hơn, nhanh hơn
    const domains: RecordDomain[] = ["catalog", "orders", "members", "branches", "customers", "jobs"]
    const files: Record<string, Uint8Array> = {}
    for (const domain of domains) {
      try {
        const csv = await exportPlatformOrgRecordsCsv(pctx, orgId as string, domain)
        files[`${domain}.csv`] = strToU8(csv)
      } catch {
        // Skip empty domains
      }
    }
    const zip = zipSync(files, { level: 6 })
    await recordPlatformAuditLog(pctx, {
      action: "organization.data.export",
      entityType: "organization",
      entityId: orgId as string,
      after: { type: "csv" },
    })
    return new NextResponse(Buffer.from(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeSlug}_data_${timestamp}.zip"`,
      },
    })
  }

  // Full export: CSV + images
  const { zip } = await exportOrgDataAsZip(pctx, orgId as string)
  await recordPlatformAuditLog(pctx, {
    action: "organization.data.export",
    entityType: "organization",
    entityId: orgId as string,
    after: { type: "full" },
  })

  return new NextResponse(Buffer.from(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeSlug}_full_${timestamp}.zip"`,
      "X-Export-Type": "full",
    },
  })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
// Tắt timeout mặc định cho export lớn (Next.js 14+)
export const maxDuration = 300
