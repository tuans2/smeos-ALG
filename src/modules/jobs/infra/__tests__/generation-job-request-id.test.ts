import { describe, expect, it, vi } from "vitest"

import { runWithRequestId } from "@/core/observability/request-context"
import type { TenantContext } from "@/core/tenancy"

import type { DbClient } from "../db-client"
import { GenerationJobRepository } from "../generation-job-repository"

const ctx = { organizationId: "org-1", workspaceId: "ws-1", userId: "u-1", branchId: null } as unknown as TenantContext
const input = {
  workspaceId: "ws-1",
  branchId: null,
  userId: "u-1",
  productId: null,
  feature: "vision.analyze",
  payload: {},
  idempotencyKey: "k-1",
}

function fakeDb() {
  const create = vi.fn(async (args: { data: Record<string, unknown> }) => args.data)
  return { db: { generation_jobs: { create } } as unknown as DbClient, create }
}

describe("generation_jobs.request_id (E1.1)", () => {
  it("ghi mã yêu cầu của request đang chạy", async () => {
    const { db, create } = fakeDb()
    await runWithRequestId("req-job-12345", () => new GenerationJobRepository(db).create(ctx, input))
    expect(create.mock.calls[0]?.[0].data).toMatchObject({ request_id: "req-job-12345", organization_id: "org-1" })
  })

  it("job tạo ngoài request (cron) để NULL", async () => {
    const { db, create } = fakeDb()
    await new GenerationJobRepository(db).create(ctx, input)
    expect(create.mock.calls[0]?.[0].data).toMatchObject({ request_id: null })
  })
})
