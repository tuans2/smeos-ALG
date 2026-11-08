/**
 * GET  /api/v1/platform/orgs-data/[orgId]/records/[domain]
 *      ?page=1
 *
 * Platform Admin: Lấy bản ghi thực tế của một domain cụ thể.
 * Domains: catalog | orders | members | branches | customers | jobs
 *
 * GET  /api/v1/platform/orgs-data/[orgId]/records/[domain]?export=csv
 *      → Trả về text/csv để download
 */

import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import {
  getPlatformOrgRecords,
  exportPlatformOrgRecordsCsv,
  type RecordDomain,
} from "@/modules/platform/use-cases/get-platform-org-records"
import { validationFailed } from "@/core/http/errors"
import { NextResponse } from "next/server"

const VALID_DOMAINS: RecordDomain[] = [
  "catalog",
  "orders",
  "members",
  "branches",
  "customers",
  "jobs",
]

export const GET = handle(async (request, { params }) => {
  const pctx = await requirePlatformContext(request)
  await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
  const { orgId, domain } = await params

  if (!VALID_DOMAINS.includes(domain as RecordDomain)) {
    throw validationFailed({ domain: `Phải là một trong: ${VALID_DOMAINS.join(", ")}` })
  }

  const url = new URL(request.url)
  const isExport = url.searchParams.get("export") === "csv"

  if (isExport) {
    const csv = await exportPlatformOrgRecordsCsv(
      pctx,
      orgId as string,
      domain as RecordDomain
    )
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${domain as string}-${orgId as string}.csv"`,
      },
    })
  }

  const pageParam = url.searchParams.get("page")
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1

  const result = await getPlatformOrgRecords(
    pctx,
    orgId as string,
    domain as RecordDomain,
    page
  )
  return jsonResponse({ data: result })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
