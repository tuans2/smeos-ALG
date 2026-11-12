import { conflict, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"

import { canResolve, dsrDueAt, type DataSubjectRequestView, type DsrStatus } from "../domain/data-subject-request"
import { exportCustomerData, packageCounts, type CustomerDataPackage } from "../infra/customer-data-export"
import { eraseCustomerData } from "../infra/customer-erasure"
import { customerExists, findDsr, insertDsr, listDsrs, resolveDsr } from "../infra/data-subject-request-repository"

/**
 * Yêu cầu của khách về dữ liệu cá nhân (ADR-014 D-P5, bước P-7a) — luật ở `../domain/data-subject-request.ts`.
 * Khách của tổ chức khác → 404. Mỗi yêu cầu ghi `audit_logs` (không kèm dữ liệu cá nhân).
 */
async function assertCustomer(ctx: TenantContext, customerId: string): Promise<void> {
  if (!(await customerExists(ctx.organizationId, customerId))) throw notFound()
}

const audit = (ctx: TenantContext, action: string, view: DataSubjectRequestView) =>
  recordAuditLog(ctx, { action, entityType: "data_subject_requests", entityId: view.id, after: { type: view.type, status: view.status, customer_id: view.customerId, result: view.result } })

/** Xuất: gói JSON dữ liệu cá nhân của khách, yêu cầu ghi ngay là hoàn tất. */
export async function exportForCustomer(ctx: TenantContext, customerId: string, note: string | null, now = new Date()) {
  await assertCustomer(ctx, customerId)
  const pkg = (await exportCustomerData(ctx.organizationId, customerId)) as CustomerDataPackage
  const request = await insertDsr(ctx.organizationId, {
    customerId, type: "EXPORT", receivedBy: ctx.userId, receivedAt: now, dueAt: dsrDueAt(now), note,
    completed: { by: ctx.userId, at: now, result: packageCounts(pkg) },
  })
  await audit(ctx, "crm.data_subject_export", request)
  return { request, package: pkg }
}

/** Xoá: ẩn danh xuyên bảng ngay, giữ dòng tài chính. */
export async function eraseForCustomer(ctx: TenantContext, customerId: string, note: string | null, now = new Date()) {
  await assertCustomer(ctx, customerId)
  const result = await eraseCustomerData(ctx.organizationId, customerId, now)
  const request = await insertDsr(ctx.organizationId, {
    customerId, type: "ERASE", receivedBy: ctx.userId, receivedAt: now, dueAt: dsrDueAt(now), note,
    completed: { by: ctx.userId, at: now, result },
  })
  await audit(ctx, "crm.data_subject_erased", request)
  return request
}

/** Sửa: ghi nhận yêu cầu; nhân viên sửa hồ sơ (`PATCH /crm/customers/:id`) rồi đóng yêu cầu. */
export async function receiveRectification(ctx: TenantContext, customerId: string, note: string | null, now = new Date()) {
  await assertCustomer(ctx, customerId)
  const request = await insertDsr(ctx.organizationId, { customerId, type: "RECTIFY", receivedBy: ctx.userId, receivedAt: now, dueAt: dsrDueAt(now), note })
  await audit(ctx, "crm.data_subject_received", request)
  return request
}

export function listDataSubjectRequests(ctx: TenantContext, filter: { status?: DsrStatus; customerId?: string }, now = new Date()) {
  return listDsrs(ctx.organizationId, filter, now)
}

/** Đóng yêu cầu đang chờ: hoàn tất hoặc từ chối. Yêu cầu tổ chức khác → 404; đã đóng → 409. */
export async function resolveDataSubjectRequest(ctx: TenantContext, id: string, input: { status: DsrStatus; note: string | null }, now = new Date()) {
  const current = await findDsr(ctx.organizationId, id)
  if (!current) throw notFound()
  if (!canResolve(current.status, input.status)) throw conflict("Yêu cầu này đã được xử lý")
  const view = await resolveDsr(ctx.organizationId, id, { status: input.status, by: ctx.userId, at: now, note: input.note })
  if (!view) throw conflict("Yêu cầu này đã được xử lý")
  await audit(ctx, "crm.data_subject_resolved", view)
  return view
}
