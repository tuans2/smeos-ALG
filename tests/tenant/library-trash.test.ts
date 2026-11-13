import { afterAll, beforeEach, describe, expect, it } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import { listPendingOutbox } from "@/modules/assets/infra/payload-outbox"
import { findExpiredLibraryTrash } from "@/modules/storage/infra/expired-trash-query"
import { LibraryTrashRepository } from "@/modules/storage/infra/library-trash-repository"
import { listLibrary } from "@/modules/storage/use-cases/list-library"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Thùng rác Kho dữ liệu cho video_jobs, content_generations, catalog_links,
 * greeting_catalogs, landing_pages (L-4, PO 05/11/2026): cách ly tổ chức,
 * ẩn khỏi danh sách, thu hồi/khôi phục link, xoá vĩnh viễn + hàng đợi xoá tệp.
 */
describe("cách ly tenant — thùng rác Kho dữ liệu (L-4)", () => {
  let a: Tenant
  let b: Tenant
  const repo = new LibraryTrashRepository()

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const video = (ctx: TenantContext, title = "Video") =>
    prisma.video_jobs.create({ data: { organization_id: ctx.organizationId, title, format: "REEL_15S", duration_seconds: 15, created_by: ctx.userId } })
  const catalog = (ctx: TenantContext, data: { is_revoked?: boolean } = {}) =>
    prisma.catalog_links.create({ data: { organization_id: ctx.organizationId, slug: `c-${crypto.randomUUID()}`, name: "Catalog", created_by: ctx.userId, ...data } })

  it("tổ chức khác không chuyển vào, khôi phục hay xoá được", async () => {
    const v = await video(a.ctx)
    expect(await repo.move(b.ctx, "VIDEO", v.id)).toBe(false)
    expect(await repo.permanentDelete(b.ctx, "VIDEO", v.id, "trash.permanent_delete")).toBe("not_found")
    expect(await prisma.video_jobs.count({ where: { id: v.id, trashed_at: null } })).toBe(1)
    expect(await repo.list(b.ctx, new Date())).toEqual([])
  })

  it("video trong thùng rác biến khỏi thư viện; xoá vĩnh viễn ghi hàng đợi xoá tệp + audit", async () => {
    const v = await video(a.ctx, "Video bó hồng")
    await prisma.video_jobs.update({ where: { id: v.id }, data: { final_video_url: `/api/v1/storage/videos/${a.organizationId}/${v.id}.mp4` } })
    const ctx = { ...a.ctx, capabilities: new Set([...a.ctx.capabilities, "I1"]) }
    expect(await repo.move(a.ctx, "VIDEO", v.id)).toBe(true)
    expect((await listLibrary(ctx, { type: "video", scope: "all", q: null, from: null, cursor: null })).items).toEqual([])
    expect((await repo.list(a.ctx, new Date())).map((i) => [i.type, i.name])).toEqual([["VIDEO", "Video bó hồng"]])

    expect(await repo.permanentDelete(a.ctx, "VIDEO", v.id, "trash.permanent_delete")).toBe("deleted")
    expect(await prisma.video_jobs.count({ where: { id: v.id } })).toBe(0)
    expect((await listPendingOutbox(10)).map((o) => o.storage_key)).toEqual([`videos/${a.organizationId}/${v.id}.mp4`])
    expect(await prisma.audit_logs.count({ where: { entity_id: v.id, action: "trash.permanent_delete" } })).toBe(1)
  })

  it("catalog: thùng rác thu hồi link; khôi phục chỉ mở lại link do thùng rác thu hồi", async () => {
    const open = await catalog(a.ctx)
    const revokedByUser = await catalog(a.ctx, { is_revoked: true })
    await repo.move(a.ctx, "CATALOG", open.id)
    await repo.move(a.ctx, "CATALOG", revokedByUser.id)
    expect((await prisma.catalog_links.findUnique({ where: { id: open.id } }))?.is_revoked).toBe(true)
    await repo.restore(a.ctx, "CATALOG", open.id)
    await repo.restore(a.ctx, "CATALOG", revokedByUser.id)
    expect((await prisma.catalog_links.findUnique({ where: { id: open.id } }))?.is_revoked).toBe(false)
    expect((await prisma.catalog_links.findUnique({ where: { id: revokedByUser.id } }))?.is_revoked).toBe(true)
  })

  it("thẻ chào: vào thùng rác thì ẩn, khôi phục vẫn ẩn; xoá vĩnh viễn xoá phiên khách nhưng giữ đơn", async () => {
    const card = await prisma.greeting_catalogs.create({ data: { organization_id: a.organizationId, code: "8-3", name: "Mừng 8/3", created_by: a.ctx.userId } })
    const session = await prisma.greeting_sessions.create({
      data: { organization_id: a.organizationId, catalog_id: card.id, send_code: "T01-001", sale_id: a.ctx.userId },
    })
    const order = await prisma.orders.create({
      data: {
        organization_id: a.organizationId, code: "L4-1", source: "BROCHURE", status: "CONFIRMED",
        total_vnd: 1, paid_vnd: 1, balance_vnd: 0, created_by: "test", source_session_id: session.id,
      },
    })
    await repo.move(a.ctx, "GREETING_CATALOG", card.id)
    expect((await prisma.greeting_catalogs.findUnique({ where: { id: card.id } }))?.is_active).toBe(false)
    await repo.restore(a.ctx, "GREETING_CATALOG", card.id)
    expect((await prisma.greeting_catalogs.findUnique({ where: { id: card.id } }))?.is_active).toBe(false)

    expect(await repo.permanentDelete(a.ctx, "GREETING_CATALOG", card.id, "trash.permanent_delete")).toBe("deleted")
    expect(await prisma.greeting_sessions.count({ where: { id: session.id } })).toBe(0)
    expect((await prisma.orders.findUnique({ where: { id: order.id } }))?.source_session_id).toBeNull()
  })

  it("mục đang dùng ở kênh bán được nhận ra; legal hold tổ chức chặn xoá và cron không quét", async () => {
    const landing = await prisma.landing_pages.create({
      data: { organization_id: a.organizationId, title: "Khai trương", input: {}, content: {}, created_by: a.ctx.userId },
    })
    await prisma.asset_usages.create({
      data: {
        organization_id: a.organizationId, source_type: "landing", source_id: landing.id, asset_type_code: "LANDING",
        destination: "SALES", cta_code: "BUY", title: "Đăng", created_by: a.ctx.userId,
      },
    })
    expect(await repo.findUsages(a.ctx, "LANDING", landing.id)).toEqual(["channel_usage"])
    expect(await repo.findUsages(b.ctx, "LANDING", landing.id)).toEqual([])

    const content = await prisma.content_generations.create({
      data: {
        organization_id: a.organizationId, origin: "content_engine_ui", channels: ["zalo"], brief: {}, brief_version: 1,
        prompt_versions: {}, rubric_version: "v1", posts: [], created_by: a.ctx.userId,
      },
    })
    const past = new Date(Date.now() - 86400000)
    await prisma.content_generations.update({ where: { id: content.id }, data: { trashed_at: past, purge_after: past } })
    expect((await findExpiredLibraryTrash(new Date(), 10)).map((i) => [i.type, i.id])).toEqual([["CONTENT", content.id]])

    await prisma.organizations.update({ where: { id: a.organizationId }, data: { legal_hold_until: new Date(Date.now() + 86400000) } })
    expect(await findExpiredLibraryTrash(new Date(), 10)).toEqual([])
    expect(await repo.permanentDelete(a.ctx, "CONTENT", content.id, "trash.permanent_delete")).toBe("legal_hold")
  })
})
