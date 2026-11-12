import { randomBytes } from "node:crypto"

import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import {
  MAX_DOMAINS_PER_ORGANIZATION, dnsInstructions, domainStatusText, normalizeHostname, txtRecordsMatch,
  legacyVerificationRecordName, verificationRecordName, type CertificateStatus, type DnsInstruction,
} from "../domain/custom-domain"
import { createRenderDomainsClient, type RenderDomainResult, type RenderDomainsClient } from "../adapters/render-custom-domains"
import { getCustomDomainRepository, type CustomDomainRepository, type CustomDomainRow } from "../infra/custom-domain-repository"
import { resolveTxtRecords, type TxtResolver } from "../infra/dns-txt"
import { invalidateCustomDomainCache, platformHostnames } from "./resolve-custom-domain"

/**
 * Cài đặt → Tên miền riêng (checklist ALG 10.8, năng lực `D19`, chỉ Điều hành). Tổ chức lấy từ phiên;
 * tên miền của tổ chức khác → 404. Tên miền là duy nhất toàn hệ thống — trùng thì báo chung chung, không
 * lộ tổ chức đang giữ.
 */

export interface CustomDomainView {
  id: string
  hostname: string
  status: CustomDomainRow["status"]
  statusText: string
  certificateStatus: CertificateStatus
  verifiedAt: string | null
  lastCheckedAt: string | null
  lockedReason: string | null
  records: DnsInstruction[]
}

export interface CustomDomainDeps {
  repo?: CustomDomainRepository
  resolveTxt?: TxtResolver
  render?: RenderDomainsClient
  env?: Record<string, string | undefined>
}

function cnameTarget(env: Record<string, string | undefined>): string | null {
  const explicit = env["CUSTOM_DOMAIN_TARGET"]?.trim()
  if (explicit) return explicit.toLowerCase()
  try {
    return env["RENDER_EXTERNAL_URL"] ? new URL(env["RENDER_EXTERNAL_URL"]).hostname : null
  } catch {
    return null
  }
}

export function toView(row: CustomDomainRow, env: Record<string, string | undefined> = process.env): CustomDomainView {
  return {
    id: row.id, hostname: row.hostname, status: row.status,
    statusText: domainStatusText(row.status, row.certificate_status),
    certificateStatus: row.certificate_status,
    verifiedAt: row.verified_at?.toISOString() ?? null,
    lastCheckedAt: row.last_checked_at?.toISOString() ?? null,
    lockedReason: row.status === "LOCKED" ? row.locked_reason : null,
    records: dnsInstructions(row.hostname, row.verification_token, cnameTarget(env)),
  }
}

const certificateFor = (r: RenderDomainResult): CertificateStatus =>
  r === "requested" ? "REQUESTED" : r === "manual" ? "MANUAL" : "FAILED"

export async function listCustomDomains(ctx: TenantContext, deps: CustomDomainDeps = {}): Promise<CustomDomainView[]> {
  requireCapability(ctx, "D19")
  const repo = deps.repo ?? getCustomDomainRepository()
  return (await repo.listForOrganization(ctx.organizationId)).map((r) => toView(r, deps.env))
}

export async function addCustomDomain(ctx: TenantContext, input: { hostname: string }, deps: CustomDomainDeps = {}): Promise<CustomDomainView> {
  requireCapability(ctx, "D19")
  const repo = deps.repo ?? getCustomDomainRepository()
  const env = deps.env ?? process.env
  const parsed = normalizeHostname(input.hostname, [...platformHostnames(env), "onrender.com", "localhost"])
  if (!parsed.ok) throw validationFailed({ hostname: parsed.error })
  if ((await repo.countForOrganization(ctx.organizationId)) >= MAX_DOMAINS_PER_ORGANIZATION) {
    throw conflict(`Mỗi cửa hàng gắn tối đa ${MAX_DOMAINS_PER_ORGANIZATION} tên miền. Gỡ bớt tên miền không dùng rồi thêm lại.`)
  }
  if (await repo.hostnameTaken(parsed.hostname)) throw conflict("Tên miền này đã được gắn trong hệ thống.")
  const row = await repo.create({ organizationId: ctx.organizationId, hostname: parsed.hostname, token: randomBytes(16).toString("hex"), createdBy: ctx.userId })
    .catch((e: unknown) => {
      // Hai cửa hàng gắn cùng lúc — ràng buộc duy nhất của CSDL chặn người sau
      if ((e as { code?: string })?.code === "P2002") throw conflict("Tên miền này đã được gắn trong hệ thống.")
      throw e
    })
  await recordAuditLog(ctx, { action: "custom_domain.add", entityType: "custom_domains", entityId: row.id, before: null, after: { hostname: row.hostname } })
  return toView(row, env)
}

export type VerifyOutcome = { verified: boolean; message: string; domain: CustomDomainView }

/** Kiểm bản ghi TXT. Đúng → VERIFIED, gửi Render gắn tên miền để cấp chứng chỉ. Sai → giữ PENDING, ghi lần kiểm. */
export async function verifyCustomDomain(ctx: TenantContext, id: string, deps: CustomDomainDeps = {}, now = new Date()): Promise<VerifyOutcome> {
  requireCapability(ctx, "D19")
  const repo = deps.repo ?? getCustomDomainRepository()
  const env = deps.env ?? process.env
  const row = await repo.find(ctx.organizationId, id)
  if (!row) throw notFound()
  if (row.status === "LOCKED") throw conflict("Tên miền đang bị khoá. Vui lòng liên hệ hỗ trợ của hệ thống.")
  if (row.status === "VERIFIED") return { verified: true, message: "Tên miền đã được xác minh.", domain: toView(row, env) }

  const resolveTxt = deps.resolveTxt ?? resolveTxtRecords
  // Thử tên bản ghi mới trước; chưa có thì thử tên cũ (_smeos-verify) cho bản ghi thêm trước khi đổi tên ALG
  const matched =
    txtRecordsMatch(await resolveTxt(verificationRecordName(row.hostname)), row.verification_token) ||
    txtRecordsMatch(await resolveTxt(legacyVerificationRecordName(row.hostname)), row.verification_token)
  if (!matched) {
    const updated = await repo.update(ctx.organizationId, id, { last_checked_at: now })
    return {
      verified: false,
      message: "Chưa thấy bản ghi TXT đúng mã xác minh. Bản ghi mới thêm có thể mất tới vài giờ để có hiệu lực — vui lòng kiểm tra lại sau.",
      domain: toView(updated ?? row, env),
    }
  }
  const attach = await (deps.render ?? createRenderDomainsClient({ env })).attach(row.hostname)
  const updated = await repo.update(ctx.organizationId, id, {
    status: "VERIFIED", verified_at: now, last_checked_at: now, certificate_status: certificateFor(attach),
  })
  if (!updated) throw notFound()
  invalidateCustomDomainCache(row.hostname)
  await recordAuditLog(ctx, { action: "custom_domain.verify", entityType: "custom_domains", entityId: id, before: { status: row.status }, after: { status: "VERIFIED", certificate: updated.certificate_status } })
  return { verified: true, message: "Đã xác minh tên miền. Trang của cửa hàng sẽ mở được trên tên miền này sau khi chứng chỉ HTTPS được cấp.", domain: toView(updated, env) }
}

/** Gỡ tên miền. Tên miền đang bị khoá thì cửa hàng không tự gỡ được (tránh gỡ rồi gắn lại để né khoá). */
export async function removeCustomDomain(ctx: TenantContext, id: string, deps: CustomDomainDeps = {}): Promise<void> {
  requireCapability(ctx, "D19")
  const repo = deps.repo ?? getCustomDomainRepository()
  const row = await repo.find(ctx.organizationId, id)
  if (!row) throw notFound()
  if (row.status === "LOCKED") throw conflict("Tên miền đang bị khoá nên chưa gỡ được. Vui lòng liên hệ hỗ trợ của hệ thống.")
  if (row.status === "VERIFIED") await (deps.render ?? createRenderDomainsClient({ env: deps.env ?? process.env })).detach(row.hostname)
  if (!(await repo.remove(ctx.organizationId, id))) throw notFound()
  invalidateCustomDomainCache(row.hostname)
  await recordAuditLog(ctx, { action: "custom_domain.remove", entityType: "custom_domains", entityId: id, before: { hostname: row.hostname, status: row.status }, after: null })
}
