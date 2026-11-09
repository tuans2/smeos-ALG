import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"
import { RlsPool } from "@/core/tenancy/infra/rls-pool"
import { withTenantDb } from "@/core/tenancy/db-context"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, type Tenant } from "../helpers/fixtures"

/**
 * RLS chế độ `enforce` cho phòng liên tổ chức (kế hoạch chat nội bộ IC-3.2, PO duyệt D4): cửa hàng đối tác đọc VÀ
 * ghi được phòng + tin chung với chuỗi; tổ chức thứ ba không thấy dòng nào và không ghi được tin vào phòng đó.
 * Cùng kỹ thuật với `rls.test.ts`: tài khoản CSDL thường (superuser bỏ qua RLS), pool đặt `app.org_id` theo ngữ cảnh.
 */
const APP_ROLE = "smeos_app_rls_test"
const APP_PASSWORD = "chi-dung-cho-test-rls"
const MIGRATIONS = path.join(__dirname, "../../prisma/migrations")

function appUrl(): string {
  const url = new URL(process.env.DATABASE_URL!)
  url.username = APP_ROLE
  url.password = APP_PASSWORD
  return url.toString()
}

function statementsOf(migrationSuffix: string): string[] {
  const dir = readdirSync(MIGRATIONS).find((d) => d.endsWith(migrationSuffix))
  if (!dir) throw new Error(`Không thấy migration ${migrationSuffix}`)
  const sql = readFileSync(path.join(MIGRATIONS, dir, "migration.sql"), "utf8")
  return sql.split(/;\s*\n/).map((x) => x.replace(/^--.*$/gm, "").trim()).filter(Boolean)
}

/**
 * CSDL test dựng bằng `prisma db push` (CI) không chạy migration. Áp policy GỐC trước khi chưa có (như `rls.test.ts` —
 * nếu chỉ tạo policy cho 2 bảng chat, `rls.test.ts` chạy sau sẽ tưởng đã có và bỏ qua các bảng khác), rồi policy mới
 * của 2 bảng chat (DROP IF EXISTS + CREATE, idempotent).
 */
async function ensureChatPolicies(): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`SELECT count(*)::bigint AS n FROM pg_policies WHERE policyname = 'tenant_isolation'`
  if (Number(rows[0]?.n ?? 0) === 0) {
    for (const stmt of statementsOf("_row_level_security")) {
      const table = stmt.match(/(?:ALTER TABLE|ON) "([a-z0-9_]+)"/)?.[1]
      if (table) {
        const found = await prisma.$queryRawUnsafe<Array<{ t: string | null }>>(`SELECT to_regclass('public."${table}"')::text AS t`)
        if (!found[0]?.t) continue
      }
      await prisma.$executeRawUnsafe(stmt)
    }
  }
  for (const stmt of statementsOf("_internal_chat_partner_rooms").filter((s) => /POLICY/.test(s))) await prisma.$executeRawUnsafe(stmt)
}

async function ensureAppRole(): Promise<void> {
  await prisma.$executeRawUnsafe(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
      CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}' NOSUPERUSER NOBYPASSRLS;
    END IF;
  END $$`)
  await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`)
  await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`)
}

describe("RLS enforce — phòng trao đổi chuỗi ↔ cửa hàng đối tác", () => {
  let chain: Tenant
  let partner: Tenant
  let third: Tenant
  let roomId: string
  let enforce: PrismaClient

  beforeAll(async () => {
    await ensureChatPolicies()
    await ensureAppRole()
    const pool = new RlsPool({ connectionString: appUrl(), max: 1, application_name: "smeos-chat-rls-test" }, "enforce")
    enforce = new PrismaClient({ adapter: new PrismaPg(pool) })
  })

  beforeEach(async () => {
    await resetDatabase()
    chain = await createTenant("rls-chuoi")
    partner = await createTenant("rls-doitac")
    third = await createTenant("rls-nguoila")
    await makeChainOrganization(chain)
    await linkPartner(chain, partner, { code: "P-01" })
    const room = await prisma.internal_chat_conversations.create({
      data: { organization_id: chain.organizationId, conversation_type: "CHAIN_PARTNER", counterpart_org_id: partner.organizationId, room_key: `partner:${partner.organizationId}`, created_by: chain.userId },
    })
    roomId = room.id
    await prisma.internal_chat_messages.create({
      data: { conversation_id: roomId, organization_id: chain.organizationId, counterpart_org_id: partner.organizationId, sender_user_id: chain.userId, sender_role: "dieu_phoi", content: "Chào tiệm" },
    })
  })

  afterAll(async () => {
    await enforce.$disconnect()
    await disconnectDatabase()
  })

  it("cửa hàng đối tác thấy phòng và tin của chuỗi", async () => {
    expect(await withTenantDb(partner.organizationId, () => enforce.internal_chat_conversations.count())).toBe(1)
    const msgs = await withTenantDb(partner.organizationId, () => enforce.internal_chat_messages.findMany({ select: { content: true } }))
    expect(msgs.map((m) => m.content)).toEqual(["Chào tiệm"])
  })

  it("cửa hàng đối tác gửi được tin vào phòng chung (mang tổ chức chuỗi + bên kia là mình)", async () => {
    await withTenantDb(partner.organizationId, () =>
      enforce.internal_chat_messages.create({
        data: { conversation_id: roomId, organization_id: chain.organizationId, counterpart_org_id: partner.organizationId, sender_user_id: partner.userId, sender_role: "cua_hang", content: "Tiệm nhận" },
      })
    )
    expect(await prisma.internal_chat_messages.count({ where: { conversation_id: roomId } })).toBe(2)
  })

  it("tổ chức thứ ba: không thấy dòng nào, không ghi lén được tin vào phòng", async () => {
    expect(await withTenantDb(third.organizationId, () => enforce.internal_chat_conversations.count())).toBe(0)
    expect(await withTenantDb(third.organizationId, () => enforce.internal_chat_messages.count())).toBe(0)
    await expect(withTenantDb(third.organizationId, () =>
      enforce.internal_chat_messages.create({
        data: { conversation_id: roomId, organization_id: chain.organizationId, counterpart_org_id: partner.organizationId, sender_user_id: third.userId, sender_role: "x", content: "ghi lén" },
      })
    )).rejects.toThrow()
    const updated = await withTenantDb(third.organizationId, () => enforce.internal_chat_messages.updateMany({ data: { content: "sửa lén" } }))
    expect(updated.count).toBe(0)
  })
})
