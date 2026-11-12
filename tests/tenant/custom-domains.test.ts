import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import type { PlatformContext } from "@/core/platform/platform-context"
import type { RenderDomainsClient } from "@/modules/custom-domain/adapters/render-custom-domains"
import {
  addCustomDomain, listCustomDomains, removeCustomDomain, verifyCustomDomain, type CustomDomainDeps,
} from "@/modules/custom-domain/use-cases/manage-custom-domains"
import { listOrganizationCustomDomains, setCustomDomainLock } from "@/modules/custom-domain/use-cases/platform-custom-domains"
import { invalidateCustomDomainCache, resolveCustomDomainRequest } from "@/modules/custom-domain/use-cases/resolve-custom-domain"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Checklist ALG 10.8 — tên miền riêng. Chỉ Điều hành (`D19`) gắn/gỡ; tên miền của tổ chức khác → 404; chưa
 * xác minh hoặc bị khoá thì không phục vụ; tên miền của A không mở được dữ liệu của B; Console xem (`N1`) và
 * khoá/mở (`N20`). DNS và Render giả lập — không gọi mạng.
 */
describe("tên miền riêng của cửa hàng", () => {
  let a: Tenant
  let b: Tenant
  const can = (t: Tenant, codes: string[]): TenantContext => ({ ...t.ctx, capabilities: new Set(codes) })
  const txt: Record<string, string[][]> = {}
  const attached: string[] = []
  const render: RenderDomainsClient = {
    attach: async (h) => { attached.push(h); return "requested" },
    detach: async () => "removed",
  }
  const deps: CustomDomainDeps = { resolveTxt: async (name) => txt[name] ?? [], render, env: {} }

  async function verifiedDomain(t: Tenant, hostname: string) {
    const d = await addCustomDomain(can(t, ["D19"]), { hostname }, deps)
    txt[`_alg-verify.${hostname}`] = [[d.records[0]!.value]]
    await verifyCustomDomain(can(t, ["D19"]), d.id, deps)
    return d
  }

  beforeEach(async () => {
    await resetDatabase()
    invalidateCustomDomainCache()
    for (const k of Object.keys(txt)) delete txt[k]
    attached.length = 0
    a = await createTenant("cd-a")
    b = await createTenant("cd-b")
    await prisma.store_share_links.createMany({ data: [
      { organization_id: a.organizationId, slug: "tiem-a-gioi-thieu", created_by: a.userId },
      { organization_id: b.organizationId, slug: "tiem-b-gioi-thieu", created_by: b.userId },
    ] })
  })
  afterAll(async () => disconnectDatabase())

  it("thiếu D19 → bị chặn xem, thêm, kiểm tra, gỡ", async () => {
    const ctx = can(a, ["R1", "D18"])
    await expect(listCustomDomains(ctx, deps)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    await expect(addCustomDomain(ctx, { hostname: "hoa.tiem-a.vn" }, deps)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    await expect(verifyCustomDomain(ctx, "x", deps)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    await expect(removeCustomDomain(ctx, "x", deps)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
  })

  it("chưa xác minh không phục vụ; TXT sai giữ chờ; TXT đúng → phục vụ và gửi cấp chứng chỉ", async () => {
    const d = await addCustomDomain(can(a, ["D19"]), { hostname: "https://Hoa.Tiem-A.vn/" }, deps)
    expect(d.hostname).toBe("hoa.tiem-a.vn")
    expect(d.status).toBe("PENDING")
    expect(await resolveCustomDomainRequest("hoa.tiem-a.vn", "/ch/tiem-a-gioi-thieu")).toEqual({ action: "not_found" })

    txt["_alg-verify.hoa.tiem-a.vn"] = [["alg-verify=sai-ma"]]
    const wrong = await verifyCustomDomain(can(a, ["D19"]), d.id, deps)
    expect(wrong.verified).toBe(false)
    expect(wrong.domain.status).toBe("PENDING")

    txt["_alg-verify.hoa.tiem-a.vn"] = [[d.records[0]!.value]]
    const ok = await verifyCustomDomain(can(a, ["D19"]), d.id, deps)
    expect(ok.verified).toBe(true)
    expect(ok.domain).toMatchObject({ status: "VERIFIED", certificateStatus: "REQUESTED" })
    expect(attached).toEqual(["hoa.tiem-a.vn"])
    expect(await resolveCustomDomainRequest("hoa.tiem-a.vn:443", "/ch/tiem-a-gioi-thieu")).toEqual({ action: "next" })
  })

  it("bản ghi cũ _smeos-verify (thêm trước khi đổi tên ALG) vẫn xác minh được", async () => {
    const d = await addCustomDomain(can(a, ["D19"]), { hostname: "cu.tiem-a.vn" }, deps)
    const token = d.records[0]!.value.replace(/^alg-verify=/, "")
    txt["_smeos-verify.cu.tiem-a.vn"] = [[`smeos-verify=${token}`]]
    const ok = await verifyCustomDomain(can(a, ["D19"]), d.id, deps)
    expect(ok.verified).toBe(true)
  })

  it("tên miền của A không mở dữ liệu của B; trang ngoài danh sách (đăng nhập) → 404; trang chủ → trang cửa hàng A", async () => {
    await verifiedDomain(a, "hoa.tiem-a.vn")
    const orgB = await prisma.organizations.findUniqueOrThrow({ where: { id: b.organizationId }, select: { slug: true } })
    const orgA = await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId }, select: { slug: true } })
    expect(await resolveCustomDomainRequest("hoa.tiem-a.vn", "/ch/tiem-b-gioi-thieu")).toEqual({ action: "not_found" })
    expect(await resolveCustomDomainRequest("hoa.tiem-a.vn", `/bst/${orgB.slug}/BST01`)).toEqual({ action: "not_found" })
    expect(await resolveCustomDomainRequest("hoa.tiem-a.vn", `/bst/${orgA.slug}/BST01`)).toEqual({ action: "next" })
    expect(await resolveCustomDomainRequest("hoa.tiem-a.vn", "/c/khong-co-that")).toEqual({ action: "not_found" })
    expect(await resolveCustomDomainRequest("hoa.tiem-a.vn", "/dang-nhap")).toEqual({ action: "not_found" })
    expect(await resolveCustomDomainRequest("hoa.tiem-a.vn", "/")).toEqual({ action: "redirect", location: "/ch/tiem-a-gioi-thieu" })
    // Máy chủ của hệ thống không bị ảnh hưởng
    expect(await resolveCustomDomainRequest("localhost:3200", "/ch/tiem-b-gioi-thieu")).toEqual({ action: "next" })
  })

  it("B không xem, kiểm tra, gỡ được tên miền của A (404); tên miền đã có người gắn → 409", async () => {
    const d = await addCustomDomain(can(a, ["D19"]), { hostname: "hoa.tiem-a.vn" }, deps)
    expect(await listCustomDomains(can(b, ["D19"]), deps)).toEqual([])
    await expect(verifyCustomDomain(can(b, ["D19"]), d.id, deps)).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(removeCustomDomain(can(b, ["D19"]), d.id, deps)).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(addCustomDomain(can(b, ["D19"]), { hostname: "hoa.tiem-a.vn" }, deps)).rejects.toMatchObject({ code: "CONFLICT" })
    expect(await prisma.custom_domains.count()).toBe(1)
  })

  it("Console khoá → ngừng phục vụ, cửa hàng không tự gỡ; mở lại → chờ xác minh lại", async () => {
    const d = await verifiedDomain(a, "hoa.tiem-a.vn")
    const viewer: PlatformContext = { userId: b.userId, capabilities: new Set(["N1"]) }
    const operator: PlatformContext = { userId: b.userId, capabilities: new Set(["N1", "N20"]) }
    expect((await listOrganizationCustomDomains(viewer, a.organizationId)).map((x) => x.hostname)).toEqual(["hoa.tiem-a.vn"])
    await expect(setCustomDomainLock(viewer, d.id, { locked: true, reason: "Giả mạo thương hiệu" })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    await expect(setCustomDomainLock(operator, d.id, { locked: true, reason: "x" })).rejects.toMatchObject({ code: "VALIDATION_FAILED" })

    const locked = await setCustomDomainLock(operator, d.id, { locked: true, reason: "Giả mạo thương hiệu" })
    expect(locked).toMatchObject({ status: "LOCKED", lockedReason: "Giả mạo thương hiệu" })
    expect(await resolveCustomDomainRequest("hoa.tiem-a.vn", "/ch/tiem-a-gioi-thieu")).toEqual({ action: "not_found" })
    await expect(removeCustomDomain(can(a, ["D19"]), d.id, deps)).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(verifyCustomDomain(can(a, ["D19"]), d.id, deps)).rejects.toMatchObject({ code: "CONFLICT" })

    const reopened = await setCustomDomainLock(operator, d.id, { locked: false })
    expect(reopened.status).toBe("PENDING")
    expect(await prisma.platform_audit_logs.count({ where: { entity_id: d.id } })).toBe(2)
  })

  it("gỡ tên miền đã xác minh → ngừng phục vụ ngay, ghi nhật ký", async () => {
    const d = await verifiedDomain(a, "hoa.tiem-a.vn")
    await removeCustomDomain(can(a, ["D19"]), d.id, deps)
    expect(await resolveCustomDomainRequest("hoa.tiem-a.vn", "/ch/tiem-a-gioi-thieu")).toEqual({ action: "next" })
    expect(await prisma.custom_domains.count()).toBe(0)
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId, action: "custom_domain.remove" } })).toBe(1)
  })
})
