import { prisma } from "@/core/tenancy/infra/prisma"
import { STUCK_JOB_TIMEOUT_MS } from "@/modules/jobs/domain/job-rules"
import type { PlatformContext } from "@/core/platform/platform-context"
import { publicChatLimitApproval } from "@/modules/platform/domain/public-chat-limit-approval"

/**
 * Chỗ DUY NHẤT trong repo được phép truy vấn NHIỀU tổ chức cùng lúc
 * (kế hoạch mục 4.4 — rủi ro Critical duy nhất của cả P25). Mọi hàm ở đây
 * nhận `PlatformContext` làm tham số đầu — không phải để lọc theo tổ chức
 * (không có tổ chức nào để lọc), mà để mọi lời gọi qua tầng này đều đứng
 * sau `requirePlatformCapability` ở use-case gọi nó.
 *
 * KHÔNG repository tenant nào (`OrganizationRepository`,
 * `UsageRepository`, `AuditLogRepository`, `GenerationJobRepository`…)
 * được thêm một nhánh "bỏ lọc organization_id" để dùng lại ở đây — thêm
 * nhánh đó là lỗi chặn ở review. Tệp này gọi thẳng `prisma`, không đi qua
 * bất kỳ repository tenant nào.
 */

export type PlatformOrganizationSummary = {
  id: string
  name: string
  slug: string
  type: string
  creditBalance: number
  createdAt: Date
  memberCount: number
}

export async function listAllOrganizations(
  _pctx: PlatformContext
): Promise<PlatformOrganizationSummary[]> {
  const organizations = await prisma.organizations.findMany({
    orderBy: { created_at: "desc" },
    include: { _count: { select: { memberships: true } } },
  })
  return organizations.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    type: org.type,
    creditBalance: org.credit_balance,
    createdAt: org.created_at,
    memberCount: org._count.memberships,
  }))
}

export type PendingApprovalItem = {
  id: string
  organizationId: string
  organizationName: string
  organizationSlug: string
  type: "LANGUAGE_UNLOCK" | "MODEL_CHANGE" | "PUBLIC_CHAT_LIMITS"
  requestedAt: string
  requestedBy?: string
  note?: string | null
  /** LANGUAGE_UNLOCK: danh sách locale yêu cầu mở */
  requestedLocales?: string[]
  /** MODEL_CHANGE: loại mô hình yêu cầu chuyển */
  requestedModelType?: string
  /** PUBLIC_CHAT_LIMITS: mức tin nhắn/10 phút tiệm xin nâng */
  requestedLimits?: { perVisitor: number; perIp: number }
}

/** Lấy tất cả yêu cầu cần duyệt trong toàn hệ thống (cross-tenant, chỉ platform). */
export async function listPendingApprovals(
  _pctx: PlatformContext
): Promise<PendingApprovalItem[]> {
  const orgs = await prisma.organizations.findMany({
    select: { id: true, name: true, slug: true, settings: true },
  })

  const items: PendingApprovalItem[] = []

  for (const org of orgs) {
    const settings = (org.settings as Record<string, unknown> | null) ?? {}

    const langUnlock = settings.pending_language_unlock as
      | { requested_locales: string[]; requested_at: string; requested_by?: string; note?: string | null }
      | null
      | undefined

    if (langUnlock) {
      items.push({
        id: `lang-${org.id}`,
        organizationId: org.id,
        organizationName: org.name,
        organizationSlug: org.slug,
        type: "LANGUAGE_UNLOCK",
        requestedAt: langUnlock.requested_at,
        ...(langUnlock.requested_by ? { requestedBy: langUnlock.requested_by } : {}),
        ...(langUnlock.note !== undefined ? { note: langUnlock.note } : {}),
        requestedLocales: langUnlock.requested_locales,
      })
    }

    const modelChange = settings.pending_model_change as
      | { requested_type: string; requested_at: string; requested_by?: string; note?: string | null }
      | null
      | undefined

    if (modelChange) {
      items.push({
        id: `model-${org.id}`,
        organizationId: org.id,
        organizationName: org.name,
        organizationSlug: org.slug,
        type: "MODEL_CHANGE",
        requestedAt: modelChange.requested_at,
        ...(modelChange.requested_by ? { requestedBy: modelChange.requested_by } : {}),
        ...(modelChange.note !== undefined ? { note: modelChange.note } : {}),
        requestedModelType: modelChange.requested_type,
      })
    }

    const chatLimits = publicChatLimitApproval(settings)
    if (chatLimits) {
      items.push({ id: `chat-limits-${org.id}`, organizationId: org.id, organizationName: org.name, organizationSlug: org.slug, ...chatLimits })
    }
  }

  // Sắp xếp theo thời gian gửi mới nhất lên đầu
  return items.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
}

export type PlatformOrganizationDetail = PlatformOrganizationSummary & {
  branchCount: number
  workspaceKinds: string[]
  lifecycleStatus: string; offboardingUntil: Date | null // ADR-016 D-S5
  isolationTier: string // ADR-016 D-S2
  unlockedLocales?: string[] | undefined
  pendingLanguageUnlock?: {
    requested_locales: string[]
    requested_at: string
    requested_by?: string
    note?: string | null
  } | null | undefined
  pendingModelChange?: {
    requested_type: string
    requested_at: string
    requested_by?: string
    note?: string | null
  } | null | undefined
}

export async function getAnyOrganization(
  _pctx: PlatformContext,
  organizationId: string
): Promise<PlatformOrganizationDetail | null> {
  const org = await prisma.organizations.findUnique({
    where: { id: organizationId },
    include: {
      _count: { select: { memberships: true, branches: true } },
      workspaces: { select: { kind: true } },
    },
  })
  if (!org) return null
  const settings = (org.settings as Record<string, unknown> | null) ?? {}
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    type: org.type,
    creditBalance: org.credit_balance,
    createdAt: org.created_at,
    memberCount: org._count.memberships,
    branchCount: org._count.branches,
    workspaceKinds: org.workspaces.map((w) => w.kind),
    lifecycleStatus: org.lifecycle_status, offboardingUntil: org.offboarding_until, isolationTier: org.isolation_tier,
    unlockedLocales: Array.isArray(settings.unlocked_locales) ? (settings.unlocked_locales as string[]) : ["vi"],
    pendingLanguageUnlock:
      (settings.pending_language_unlock as
        | PlatformOrganizationDetail["pendingLanguageUnlock"]
        | undefined) ?? null,
    pendingModelChange:
      (settings.pending_model_change as
        | PlatformOrganizationDetail["pendingModelChange"]
        | undefined) ?? null,
  }
}

export type PlatformUsageRow = {
  organizationId: string
  organizationName: string
  feature: string
  quantity: number
  costCredit: number
}

/** Usage tổng hợp toàn hệ thống, gộp theo (tổ chức, tính năng). */
export async function summarizeUsageAcrossOrganizations(
  _pctx: PlatformContext,
  input: { since?: Date } = {}
): Promise<PlatformUsageRow[]> {
  const grouped = await prisma.usage.groupBy({
    by: ["organization_id", "feature"],
    ...(input.since ? { where: { created_at: { gte: input.since } } } : {}),
    _sum: { quantity: true, cost_credit: true },
  })
  if (grouped.length === 0) return []

  const organizationIds = [...new Set(grouped.map((row) => row.organization_id))]
  const organizations = await prisma.organizations.findMany({
    where: { id: { in: organizationIds } },
    select: { id: true, name: true },
  })
  const nameById = new Map(organizations.map((org) => [org.id, org.name]))

  return grouped.map(
    (row: {
      organization_id: string
      feature: string
      _sum: { quantity: number | null; cost_credit: number | null }
    }) => ({
      organizationId: row.organization_id,
      organizationName: nameById.get(row.organization_id) ?? "(đã xoá)",
      feature: row.feature,
      quantity: row._sum.quantity ?? 0,
      costCredit: row._sum.cost_credit ?? 0,
    })
  )
}

export type PlatformSystemHealth = {
  jobCountsByStatus: Record<string, number>
  stuckJobs: Array<{ id: string; organizationId: string; feature: string; startedAt: Date | null }>
}

/**
 * CHỈ ĐỌC (D-N5) — không đánh dấu job treo là FAILED. Việc đó vẫn thuộc
 * `scripts/scan-stuck-jobs.ts` (`YC-J10`), chạy ngoài request HTTP. Dùng
 * chung ngưỡng `STUCK_JOB_TIMEOUT_MS` để "job treo" nghĩa giống nhau ở cả
 * hai nơi.
 */
export async function readSystemHealth(_pctx: PlatformContext): Promise<PlatformSystemHealth> {
  const grouped = await prisma.generation_jobs.groupBy({
    by: ["status"],
    _count: { _all: true },
  })
  const jobCountsByStatus: Record<string, number> = {}
  for (const row of grouped) jobCountsByStatus[row.status] = row._count._all

  const threshold = new Date(Date.now() - STUCK_JOB_TIMEOUT_MS)
  const stuck = await prisma.generation_jobs.findMany({
    where: { status: "PROCESSING", started_at: { lt: threshold } },
    select: { id: true, organization_id: true, feature: true, started_at: true },
    orderBy: { started_at: "asc" },
    take: 100,
  })

  return {
    jobCountsByStatus,
    stuckJobs: stuck.map((job) => ({
      id: job.id,
      organizationId: job.organization_id,
      feature: job.feature,
      startedAt: job.started_at,
    })),
  }
}

export type PlatformAuditRow = {
  id: string
  source: "organization" | "platform"
  organizationId: string | null
  userId: string
  action: string
  entityType: string
  entityId: string
  createdAt: Date
}

/** Hợp `audit_logs` (mọi tổ chức) và `platform_audit_logs`, mới nhất trước. */
export async function listAuditAcrossOrganizations(
  _pctx: PlatformContext,
  limit = 100
): Promise<PlatformAuditRow[]> {
  const [orgLogs, platformLogs] = await Promise.all([
    prisma.audit_logs.findMany({
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        organization_id: true,
        user_id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        created_at: true,
      },
    }),
    prisma.platform_audit_logs.findMany({
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        user_id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        created_at: true,
      },
    }),
  ])

  const merged: PlatformAuditRow[] = [
    ...orgLogs.map(
      (row: {
        id: string
        organization_id: string
        user_id: string
        action: string
        entity_type: string
        entity_id: string
        created_at: Date
      }) => ({
        id: row.id,
        source: "organization" as const,
        organizationId: row.organization_id,
        userId: row.user_id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        createdAt: row.created_at,
      })
    ),
    ...platformLogs.map(
      (row: {
        id: string
        user_id: string
        action: string
        entity_type: string
        entity_id: string
        created_at: Date
      }) => ({
        id: row.id,
        source: "platform" as const,
        organizationId: null,
        userId: row.user_id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        createdAt: row.created_at,
      })
    ),
  ]

  merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return merged.slice(0, limit)
}
