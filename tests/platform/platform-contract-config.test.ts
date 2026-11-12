import { afterAll, beforeAll, describe, it } from "vitest"

import * as R from "@/app/api/v1/platform/_contracts/responses-config"
import { GET as behaviors } from "@/app/api/v1/platform/behaviors/route"
import { POST as upsertValue } from "@/app/api/v1/platform/catalogs/[key]/values/route"
import { GET as catalogs } from "@/app/api/v1/platform/catalogs/route"
import { POST as deactivate } from "@/app/api/v1/platform/fields/[key]/deactivate/route"
import { GET as listFields, PATCH as patchField, POST as createField } from "@/app/api/v1/platform/fields/route"
import { GET as getGov, PUT as putGov } from "@/app/api/v1/platform/governance-matrix/route"
import { GET as getIntegrationGov, PUT as putIntegrationGov } from "@/app/api/v1/platform/integrations/governance/route"
import { GET as getNav, PUT as putNav } from "@/app/api/v1/platform/nav-matrix/route"
import { GET as getChannels, PATCH as patchChannel } from "@/app/api/v1/platform/notification/channels/route"
import { GET as events } from "@/app/api/v1/platform/notification/events/route"
import { DELETE as removeLock, GET as getLocks, POST as setLock } from "@/app/api/v1/platform/notification/hard-locks/route"
// @release-strip — route/mô-đun không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
import { GET as getVisibility, PATCH as patchVisibility } from "@/app/api/v1/platform/notification/visibility/route"
// @release-strip-end
import { PUT as fieldOverrides } from "@/app/api/v1/platform/organizations/[id]/field-overrides/route"
import { GET as fieldPreview } from "@/app/api/v1/platform/organizations/[id]/field-preview/route"
import { GET as getFlags, PUT as putFlags } from "@/app/api/v1/platform/ux-rollout-flags/route"
import { ALL_PLATFORM_CAPABILITY_CODES } from "@/core/platform/platform-capability-catalog"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi Console — cấu hình toàn sàn (OpenAPI `/platform/*`, PO 07/11/2026), CSDL thật, lược đồ strict. */
const BASE = "http://localhost/api/v1/platform"
const ps = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) })

describe("hợp đồng — Console Vận hành Nền tảng: cấu hình", () => {
  let op: Tenant
  let shop: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, op.token)
  const send = (path: string, method: string, body: unknown) => withSession(`${BASE}${path}`, op.token, { method, body: JSON.stringify(body) })

  beforeAll(async () => {
    await resetDatabase()
    op = await createTenant("van-hanh-cau-hinh")
    shop = await createTenant("tiem-cau-hinh")
    await new PlatformOperatorRepository().grant(op.userId, [...ALL_PLATFORM_CAPABILITY_CODES], null)
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("trường dữ liệu, danh mục, hành vi, ghi đè theo tổ chức", async () => {
    await prisma.field_definitions.create({
      data: { key: "customerPhone", entity: "ORDER", origin: "CORE", data_type: "PHONE", label: "SĐT người mua", requirement: "REQUIRED", required_at_stage: "INTAKE", sensitivity: "PII", status: "ACTIVE" },
    })
    // Bảng cấp nền tảng — `resetDatabase` không dọn: xoá danh mục thử của lần chạy trước rồi tạo lại
    await prisma.field_catalogs.deleteMany({ where: { key: "kenh_ban" } })
    await prisma.field_catalogs.create({ data: { key: "kenh_ban", label: "Kênh bán", governance: "OPEN" } })
    await expectContract(await listFields(get("/fields?entity=ORDER")), 200, R.fieldsResponse, "fields")
    await expectContract(await patchField(send("/fields", "PATCH", { key: "customerPhone", label: "Số điện thoại người mua" })), 200, R.fieldResponse, "field")
    const created = await expectContract(
      await createField(send("/fields", "POST", { entity: "ORDER", label: "Mã giới thiệu", dataType: "TEXT" })),
      200,
      R.fieldResponse,
      "field"
    )
    const key = (created.data as { key: string }).key
    await expectContract(await upsertValue(send("/catalogs/kenh_ban/values", "POST", { code: "ZALO", label: "Zalo" }), ps({ key: "kenh_ban" })), 200, R.catalogValueResponse, "catalog-value")
    await expectContract(await catalogs(get("/catalogs")), 200, R.catalogsResponse, "catalogs")
    await expectContract(await behaviors(get("/behaviors")), 200, R.behaviorsResponse, "behaviors")
    const id = shop.organizationId
    await expectContract(
      await fieldOverrides(send(`/organizations/${id}/field-overrides`, "PUT", { target: "field", fieldKey: "customerPhone", label: "SĐT khách" }), ps({ id })),
      200,
      R.fieldOverrideResponse,
      "field-override"
    )
    await expectContract(
      await fieldOverrides(send(`/organizations/${id}/field-overrides`, "PUT", { target: "catalogValue", catalogKey: "kenh_ban", code: "ZALO", isEnabled: false }), ps({ id })),
      200,
      R.fieldOverrideResponse,
      "field-override"
    )
    await expectContract(await fieldPreview(get(`/organizations/${id}/field-preview?entity=ORDER`), ps({ id })), 200, R.fieldPreviewResponse, "field-preview")
    await expectContract(await deactivate(send(`/fields/${key}/deactivate`, "POST", {}), ps({ key })), 200, R.fieldResponse, "field")
  })

  it("ma trận quản trị, điều hướng, cờ giao diện", async () => {
    await expectContract(await getGov(get("/governance-matrix?system=PROMOTIONS")), 200, R.governanceMatrixResponse, "governance-matrix")
    await expectContract(
      await putGov(send("/governance-matrix?system=PROMOTIONS", "PUT", { decisions: { overrides: { "voucher.tet": true }, locks: { "voucher.tet": { enabled: true } } } })),
      200,
      R.governanceMatrixResponse,
      "governance-matrix"
    )
    await expectContract(await getNav(get("/nav-matrix")), 200, R.navMatrixResponse, "nav-matrix")
    await expectContract(await putNav(send("/nav-matrix", "PUT", { overrides: { FLORAL: ["kho"] } })), 200, R.saveNavMatrixResponse, "nav-matrix-save")
    await expectContract(await getFlags(get("/ux-rollout-flags")), 200, R.uxRolloutFlagsResponse, "ux-flags")
    await expectContract(
      await putFlags(send("/ux-rollout-flags", "PUT", { flags: { ux_pd_cai_dat: { mode: "allowlist", organizationIds: [shop.organizationId] } } })),
      200,
      R.saveUxRolloutFlagsResponse,
      "ux-flags-save"
    )
  })

  it("thông báo: sự kiện, kênh, hiển thị theo tầng, khoá cứng", async () => {
    await expectContract(await events(get("/notification/events")), 200, R.notificationEventsResponse, "notification-events")
    await expectContract(await patchChannel(send("/notification/channels", "PATCH", { channel: "EMAIL", activated: true })), 200, R.channelActivationSavedResponse, "channel-saved")
    await expectContract(await getChannels(get("/notification/channels")), 200, R.channelActivationsResponse, "channels")
    // @release-strip
    await expectContract(await patchVisibility(send("/notification/visibility", "PATCH", { event_key: "ORDER_RECEIVED", tier: "STORE", visible: true })), 200, R.eventVisibilitySavedResponse, "visibility-saved")
    await expectContract(await getVisibility(get("/notification/visibility")), 200, R.eventVisibilityResponse, "visibility")
    // @release-strip-end
    await expectContract(await setLock(send("/notification/hard-locks", "POST", { event_key: "ORDER_RECEIVED", channel: "EMAIL", enabled: true, reason: "Bắt buộc" })), 200, R.hardLockSetResponse, "hard-lock-set")
    await expectContract(await getLocks(get("/notification/hard-locks")), 200, R.hardLocksResponse, "hard-locks")
    await expectContract(await removeLock(send("/notification/hard-locks", "DELETE", { event_key: "ORDER_RECEIVED", channel: "EMAIL" })), 200, R.hardLockRemovedResponse, "hard-lock-removed")
  })

  it("quản trị tích hợp toàn sàn", async () => {
    const gov = await expectContract(await getIntegrationGov(get("/integrations/governance")), 200, R.integrationGovernanceResponse, "integration-governance")
    const connectorKey = (gov.items as { connectorKey: string }[])[0]?.connectorKey ?? "echo"
    await expectContract(
      await putIntegrationGov(send("/integrations/governance", "PUT", { scopeId: "GLOBAL", connectorKey, mode: "INHERIT_ONLY" })),
      200,
      R.integrationGovernanceResponse,
      "integration-governance"
    )
  })
})
