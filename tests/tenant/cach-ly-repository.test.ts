import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { TenantScopeViolation, scopedWhere } from "@/core/tenancy"
import { BranchRepository } from "@/modules/organization/infra/branch-repository"
import { CapabilityRepository } from "@/modules/organization/infra/capability-repository"
import { MembershipRepository } from "@/modules/organization/infra/membership-repository"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { WorkspaceRepository } from "@/modules/organization/infra/workspace-repository"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { AuditLogRepository } from "@/modules/audit/infra/audit-log-repository"
import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { UsageRepository } from "@/modules/usage/infra/usage-repository"
import { BrandProfileRepository } from "@/modules/profiles/infra/brand-profile-repository"
import { BusinessProfileRepository } from "@/modules/profiles/infra/business-profile-repository"
import { IntegrationTokenRepository } from "@/modules/integration/infra/integration-token-repository"
import { FieldConfigOverrideRepository } from "@/modules/field-platform/infra/field-config-override-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Bộ gác nằm ở tầng repository (`YC-T3`). Mỗi bảng có `organization_id` phải
 * có một trường hợp ở đây: đọc bản ghi của tổ chức A bằng ngữ cảnh của tổ chức
 * B, kết quả phải là **không tìm thấy** — không phải lỗi quyền, vì lỗi quyền
 * đã tiết lộ rằng bản ghi tồn tại (đặc tả 07 mục 11).
 */
describe("cách ly tenant ở tầng repository", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("organizations — tổ chức hiện tại chỉ là tổ chức của chính ngữ cảnh", async () => {
    const repository = new OrganizationRepository()

    const own = await repository.current(a.ctx)
    expect(own?.id).toBe(a.organizationId)

    const other = await repository.current(b.ctx)
    expect(other?.id).toBe(b.organizationId)
    expect(other?.id).not.toBe(a.organizationId)
  })

  it("workspaces — workspace của A không đọc được bằng ngữ cảnh của B", async () => {
    const repository = new WorkspaceRepository()

    expect(await repository.findById(a.ctx, a.ctx.workspaceId)).not.toBeNull()
    expect(await repository.findById(b.ctx, a.ctx.workspaceId)).toBeNull()

    const listOfB = await repository.list(b.ctx)
    expect(listOfB.map((row) => row.id)).toEqual([b.ctx.workspaceId])
  })

  it("branches — chi nhánh của A không đọc, không sửa được bằng ngữ cảnh của B", async () => {
    const repository = new BranchRepository()
    const branchOfA = await repository.create(a.ctx, { name: "Chi nhánh 1", code: "CN01" })

    expect(await repository.findById(a.ctx, branchOfA.id)).not.toBeNull()
    expect(await repository.findById(b.ctx, branchOfA.id)).toBeNull()
    expect(await repository.findByCode(b.ctx, "CN01")).toBeNull()
    expect(await repository.list(b.ctx)).toEqual([])

    // Ghi cũng phải trượt: cập nhật theo khoá chính mà không lọc tổ chức là
    // đường sửa được dữ liệu của tổ chức khác nếu đoán đúng id.
    expect(await repository.update(b.ctx, branchOfA.id, { name: "Bị đổi tên" })).toBeNull()
    const unchanged = await repository.findById(a.ctx, branchOfA.id)
    expect(unchanged?.name).toBe("Chi nhánh 1")
  })

  it("roles — vai riêng của A không đọc được bằng ngữ cảnh của B", async () => {
    const repository = new RoleRepository()
    const roleOfA = await repository.create(a.ctx, { key: "thu_ngan", name: "Thu ngân" })

    expect(await repository.findById(a.ctx, roleOfA.id)).not.toBeNull()
    expect(await repository.findById(b.ctx, roleOfA.id)).toBeNull()
    expect(await repository.findAssignableById(b.ctx, roleOfA.id)).toBeNull()
    expect(await repository.listForOrganization(b.ctx)).toEqual([])
  })

  it("roles — vai hệ thống dùng chung, và đó là ngoại lệ duy nhất", async () => {
    const repository = new RoleRepository()
    const founder = await repository.findSystemRoleByKey("dieu_hanh")
    expect(founder).not.toBeNull()

    // Vai hệ thống có organization_id = null nên mọi tổ chức gán được.
    expect(await repository.findAssignableById(a.ctx, founder!.id)).not.toBeNull()
    expect(await repository.findAssignableById(b.ctx, founder!.id)).not.toBeNull()

    // Nhưng nó không nằm trong danh sách vai *của* tổ chức nào.
    expect(await repository.listForOrganization(a.ctx)).toEqual([])
  })

  it("capability_overrides — ngoại lệ quyền của A không đọc được bằng ngữ cảnh của B", async () => {
    const roles = new RoleRepository()
    const capabilities = new CapabilityRepository()
    const founder = await roles.findSystemRoleByKey("dieu_hanh")
    if (!founder) throw new Error("thiếu vai hệ thống dieu_hanh — chạy ensureSystemRoles trước")

    // A bật một ngoại lệ cho vai hệ thống Điều hành trong TỔ CHỨC CỦA A.
    await capabilities.upsertOverride(a.ctx, {
      roleId: founder.id,
      capabilityCode: "A3",
      allowed: false,
      updatedBy: a.userId,
    })

    const ofA = await capabilities.listOverridesForRole(a.ctx, founder.id)
    expect(ofA.map((row) => row.capability_code)).toEqual(["A3"])

    // Vai hệ thống dùng chung nên B đọc được CÙNG role.id — nhưng ngoại lệ
    // của A không được lộ sang ngữ cảnh của B.
    const ofB = await capabilities.listOverridesForRole(b.ctx, founder.id)
    expect(ofB).toEqual([])

    // Quyền hiệu lực của B với vai Điều hành vẫn có A3 — không bị A tắt mất.
    const grantsOfB = await capabilities.resolveGrants(b.organizationId, founder.id, founder.key)
    expect(grantsOfB.map((g) => g.code)).toContain("A3")
  })

  it("memberships — tư cách thành viên của A không đọc được bằng ngữ cảnh của B", async () => {
    const repository = new MembershipRepository()

    const ofA = await repository.findForCurrentUser(a.ctx)
    expect(ofA).not.toBeNull()
    expect(await repository.findById(b.ctx, ofA!.id)).toBeNull()

    const listOfB = await repository.list(b.ctx)
    expect(listOfB).toHaveLength(1)
    expect(listOfB[0]?.user_id).toBe(b.userId)
  })

  it("assets — asset của A không đọc được bằng ngữ cảnh của B (YC-A, đặc tả 07 mục 5)", async () => {
    const repository = new AssetRepository()
    const created = await repository.create(a.ctx, {
      id: "11111111-1111-1111-1111-111111111111",
      productId: null,
      parentAssetId: null,
      kind: "ORIGINAL",
      version: 1,
      storageKey: `org/${a.organizationId}/unfiled/11111111-1111-1111-1111-111111111111.jpg`,
      mimeType: "image/jpeg",
      createdBy: a.userId,
    })

    expect(await repository.findById(a.ctx, created.id)).not.toBeNull()
    expect(await repository.findById(b.ctx, created.id)).toBeNull()
    expect(await repository.list(b.ctx, { limit: 10 })).toEqual([])
    expect(await repository.delete(b.ctx, created.id)).toBe(false)

    const stillThere = await repository.findById(a.ctx, created.id)
    expect(stillThere).not.toBeNull()
  })

  it("generation_jobs — job của A không đọc, không huỷ được bằng ngữ cảnh của B (đặc tả 07 mục 6)", async () => {
    const repository = new GenerationJobRepository()
    const created = await repository.create(a.ctx, {
      workspaceId: a.ctx.workspaceId,
      branchId: null,
      userId: a.userId,
      productId: null,
      feature: "vision.analyze",
      payload: { asset_ids: [] },
      idempotencyKey: "test-key-cach-ly-1",
    })

    expect(await repository.findById(a.ctx, created.id)).not.toBeNull()
    expect(await repository.findById(b.ctx, created.id)).toBeNull()
    expect(
      await repository.findByIdempotencyKey(b.ctx, "vision.analyze", "test-key-cach-ly-1")
    ).toBeNull()
    expect(await repository.list(b.ctx, { limit: 10 })).toEqual([])
    expect(await repository.cancelIfPending(b.ctx, created.id)).toBeNull()

    const stillPending = await repository.findById(a.ctx, created.id)
    expect(stillPending?.status).toBe("PENDING")
  })

  it("usage — dòng usage của A không đọc được bằng ngữ cảnh của B (đặc tả 07 mục 7)", async () => {
    const repository = new UsageRepository()
    await repository.record(a.ctx, {
      workspaceId: a.ctx.workspaceId,
      userId: a.userId,
      feature: "vision.analyze",
      costCredit: 1,
      status: "ENQUEUED",
    })

    expect(await repository.list(a.ctx, { limit: 10 })).toHaveLength(1)
    expect(await repository.list(b.ctx, { limit: 10 })).toEqual([])
    expect(await repository.summaryByFeature(b.ctx)).toEqual([])
  })

  it("audit_logs — bản ghi kiểm toán của A không đọc được bằng ngữ cảnh của B (YC-R4, đặc tả 07 mục 8)", async () => {
    const repository = new AuditLogRepository()
    await repository.record(a.ctx, {
      action: "product.approve",
      entityType: "product_analyses",
      entityId: "bat-ky",
    })

    expect(await repository.list(a.ctx, { limit: 10 })).toHaveLength(1)
    expect(await repository.list(b.ctx, { limit: 10 })).toEqual([])
  })

  it("business_profiles — hồ sơ kinh doanh của A không lộ sang ngữ cảnh của B (đặc tả 07 mục 4)", async () => {
    const repository = new BusinessProfileRepository()

    expect(await repository.current(a.ctx)).toBeNull()
    await repository.upsert(a.ctx, { display_name: "Tiệm hoa của A" })

    const own = await repository.current(a.ctx)
    expect(own?.display_name).toBe("Tiệm hoa của A")
    expect(own?.organization_id).toBe(a.organizationId)

    // B chưa từng ghi gì — ngữ cảnh của B không thấy hồ sơ của A, kể cả gián
    // tiếp qua một bản ghi "current" nào khác.
    expect(await repository.current(b.ctx)).toBeNull()

    await repository.upsert(b.ctx, { display_name: "Tiệm hoa của B" })
    expect((await repository.current(a.ctx))?.display_name).toBe("Tiệm hoa của A")
    expect((await repository.current(b.ctx))?.display_name).toBe("Tiệm hoa của B")
  })

  it("business_profiles — PUT thay toàn bộ bản ghi, trường vắng mặt thành null", async () => {
    const repository = new BusinessProfileRepository()
    await repository.upsert(a.ctx, { display_name: "Tiệm hoa", phone: "0900000000" })
    expect((await repository.current(a.ctx))?.phone).toBe("0900000000")

    await repository.upsert(a.ctx, { display_name: "Tiệm hoa" })
    expect((await repository.current(a.ctx))?.phone).toBeNull()
  })

  it("brand_profiles — hồ sơ thương hiệu của A không lộ sang ngữ cảnh của B (đặc tả 07 mục 4)", async () => {
    const repository = new BrandProfileRepository()

    expect(await repository.current(a.ctx)).toBeNull()
    await repository.upsert(a.ctx, { primary_color: "#0A74DA" })

    expect((await repository.current(a.ctx))?.primary_color).toBe("#0A74DA")
    expect(await repository.current(b.ctx)).toBeNull()

    await repository.upsert(b.ctx, { primary_color: "#F5A623" })
    expect((await repository.current(a.ctx))?.primary_color).toBe("#0A74DA")
    expect((await repository.current(b.ctx))?.primary_color).toBe("#F5A623")
  })

  it("integration_tokens — token của A không đọc, không thu hồi được bằng ngữ cảnh của B (P7, YC-T8)", async () => {
    const repository = new IntegrationTokenRepository()
    const tokenOfA = await repository.create(a.ctx, {
      client: "LOCALBUDD",
      tokenHash: "hash-gia-lap-cua-a",
      createdBy: a.userId,
      expiresAt: new Date(Date.now() + 86_400_000),
    })

    expect(await repository.findById(a.ctx, tokenOfA.id)).not.toBeNull()
    expect(await repository.findById(b.ctx, tokenOfA.id)).toBeNull()
    expect(await repository.list(b.ctx)).toEqual([])

    expect(await repository.revoke(b.ctx, tokenOfA.id, new Date())).toBe(false)
    const stillActive = await repository.findActiveByHash("hash-gia-lap-cua-a", new Date())
    expect(stillActive?.revoked_at).toBeNull()

    expect(await repository.revoke(a.ctx, tokenOfA.id, new Date())).toBe(true)
  })

  it("bộ gác từ chối mệnh đề where tự khai organization_id", () => {
    expect(() => scopedWhere(a.ctx, { organization_id: b.organizationId })).toThrow(
      TenantScopeViolation
    )
  })

  it("bộ gác luôn ghi đè bằng tổ chức của ngữ cảnh", () => {
    expect(scopedWhere(a.ctx, { id: "bat-ky" })).toEqual({
      id: "bat-ky",
      organization_id: a.organizationId,
    })
  })

  /**
   * ĐP-3 — `field_config_overrides` là bảng TENANT nhưng chỉ quản trị nền
   * tảng (N12) ghi vào; route tenant duy nhất chạm bảng này
   * (`GET /field-config`) chỉ ĐỌC qua `listForOrganization(ctx)`
   * (`scopedWhere`). Ghi thẳng bằng `organizationId` (như use-case nền tảng
   * làm) rồi xác nhận ngữ cảnh của B không đọc được ghi đè của A.
   */
  it("field_config_overrides — ghi đè của A không đọc được bằng ngữ cảnh của B", async () => {
    const repository = new FieldConfigOverrideRepository()

    await repository.setFieldOverride({
      organizationId: a.organizationId,
      fieldKey: "cardMessage",
      label: "Nội dung thiệp (tổ chức A)",
      actorUserId: "system_seed",
    })

    const ofA = await repository.listForOrganization(a.ctx)
    expect(ofA.map((row) => row.override_key)).toEqual(["cardMessage"])

    const ofB = await repository.listForOrganization(b.ctx)
    expect(ofB).toEqual([])
  })
})
