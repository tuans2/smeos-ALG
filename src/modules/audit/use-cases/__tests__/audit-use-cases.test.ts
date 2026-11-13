import { describe, expect, it, vi, beforeEach } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { IAuditLogRepository } from "../../domain/repositories/audit-log-repository.interface"
import { recordAuditLog } from "../record-audit-log"
import { listAuditLogs } from "../list-audit-logs"

const ctx: TenantContext = {
  organizationId: "org-audit-01",
  userId: "user-audit-01",
  workspaceId: "ws-audit-01",
  branchId: null,
  capabilities: new Set(["G9"]),
}

describe("audit: use-cases with DI", () => {
  const mockAuditRepo: IAuditLogRepository = {
    record: vi.fn(),
    list: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("recordAuditLog gọi repository record với đúng input", async () => {
    vi.mocked(mockAuditRepo.record).mockResolvedValue({
      id: "log-01",
      organization_id: "org-audit-01",
      user_id: "user-audit-01",
      action: "order.approve",
      entity_type: "orders",
      entity_id: "ord-01",
      before: null,
      after: { status: "APPROVED" },
      ip: null,
      user_agent: null,
      created_at: new Date(),
    } as never)

    const result = await recordAuditLog(
      ctx,
      {
        action: "order.approve",
        entityType: "orders",
        entityId: "ord-01",
        after: { status: "APPROVED" },
      },
      undefined,
      mockAuditRepo
    )

    expect(result.id).toBe("log-01")
    expect(mockAuditRepo.record).toHaveBeenCalledTimes(1)
  })

  it("listAuditLogs trả về danh sách nhật ký kiểm toán và tính next_cursor", async () => {
    vi.mocked(mockAuditRepo.list).mockResolvedValue([
      {
        id: "log-02",
        organization_id: "org-audit-01",
        user_id: "user-audit-01",
        action: "login",
        entity_type: "session",
        entity_id: "sess-01",
        before: null,
        after: null,
        ip: null,
        user_agent: null,
        created_at: new Date(),
      } as never,
    ])

    const result = await listAuditLogs(ctx, { limit: 10 }, mockAuditRepo)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]!.action).toBe("login")
    expect(result.next_cursor).toBeNull()
  })
})
