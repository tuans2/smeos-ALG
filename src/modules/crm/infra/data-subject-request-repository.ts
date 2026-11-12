import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma } from "@/generated/prisma/client"

import type { DataSubjectRequestView, DsrStatus, DsrType } from "../domain/data-subject-request"

/** Bảng `data_subject_requests` (ADR-014 D-P5) — mọi truy vấn kèm `organization_id` của phiên. */
type Row = Prisma.data_subject_requestsGetPayload<object>

function toView(r: Row, now: Date): DataSubjectRequestView {
  return {
    id: r.id, customerId: r.customer_id, type: r.type, status: r.status, receivedBy: r.received_by,
    receivedAt: r.received_at.toISOString(), dueAt: r.due_at.toISOString(),
    overdue: r.status === "RECEIVED" && r.due_at.getTime() < now.getTime(),
    note: r.note, completedBy: r.completed_by, completedAt: r.completed_at?.toISOString() ?? null,
    result: (r.result as Record<string, number> | null) ?? null,
  }
}

export interface NewDsr {
  customerId: string
  type: DsrType
  receivedBy: string
  receivedAt: Date
  dueAt: Date
  note: string | null
  /** Có khi xử lý ngay (xuất, xoá). */
  completed?: { by: string; at: Date; result: Record<string, number> }
  /** Xoá còn chờ đơn đang mở (audit User Journey UJ-28): yêu cầu giữ RECEIVED nhưng ghi phần đã xoá. */
  partialResult?: Record<string, number>
}

export async function insertDsr(organizationId: string, input: NewDsr): Promise<DataSubjectRequestView> {
  const row = await prisma.data_subject_requests.create({
    data: {
      organization_id: organizationId, customer_id: input.customerId, type: input.type, received_by: input.receivedBy,
      received_at: input.receivedAt, due_at: input.dueAt, note: input.note,
      ...(input.completed
        ? { status: "COMPLETED", completed_by: input.completed.by, completed_at: input.completed.at, result: input.completed.result }
        : input.partialResult ? { result: input.partialResult } : {}),
    },
  })
  return toView(row, input.receivedAt)
}

export async function listDsrs(organizationId: string, filter: { status?: DsrStatus; customerId?: string }, now: Date): Promise<DataSubjectRequestView[]> {
  const rows = await prisma.data_subject_requests.findMany({
    where: { organization_id: organizationId, ...(filter.status ? { status: filter.status } : {}), ...(filter.customerId ? { customer_id: filter.customerId } : {}) },
    orderBy: { received_at: "desc" },
    take: 200,
  })
  return rows.map((r) => toView(r, now))
}

export async function findDsr(organizationId: string, id: string): Promise<Row | null> {
  return prisma.data_subject_requests.findFirst({ where: { organization_id: organizationId, id } })
}

/** Đóng yêu cầu đang chờ; `null` khi yêu cầu đã đổi trạng thái giữa chừng. */
export async function resolveDsr(
  organizationId: string, id: string, input: { status: DsrStatus; by: string; at: Date; note: string | null },
): Promise<DataSubjectRequestView | null> {
  const { count } = await prisma.data_subject_requests.updateMany({
    where: { organization_id: organizationId, id, status: "RECEIVED" },
    data: { status: input.status, completed_by: input.by, completed_at: input.at, ...(input.note !== null ? { note: input.note } : {}) },
  })
  if (count === 0) return null
  const row = await findDsr(organizationId, id)
  return row ? toView(row, input.at) : null
}

/** Khách có thuộc tổ chức không — khách tổ chức khác coi như không có. */
export async function customerExists(organizationId: string, customerId: string): Promise<boolean> {
  return (await prisma.customers.count({ where: { organization_id: organizationId, id: customerId } })) > 0
}

/**
 * Yêu cầu xoá đang chờ mà khách không còn đơn nào chưa kết thúc (XUYÊN tổ chức — chỉ gọi từ lượt quét nội bộ, audit
 * User Journey UJ-28). Cũ trước, có trần.
 */
export async function listCompletableErasures(limit: number): Promise<{ id: string; organizationId: string; customerId: string }[]> {
  const rows = await prisma.data_subject_requests.findMany({
    where: {
      type: "ERASE",
      status: "RECEIVED",
      customer_id: { not: null },
      customer: { is: { orders: { none: { status: { notIn: ["COMPLETED", "CANCELLED"] } } } } },
    },
    orderBy: { received_at: "asc" },
    take: limit,
    select: { id: true, organization_id: true, customer_id: true },
  })
  return rows.map((r) => ({ id: r.id, organizationId: r.organization_id, customerId: r.customer_id as string }))
}

/** Hoàn tất yêu cầu đang chờ (có điều kiện RECEIVED) trong giao dịch của người gọi; `false` = đã đổi giữa chừng. */
export async function completeDsrIn(
  tx: Prisma.TransactionClient, organizationId: string, id: string, input: { by: string; at: Date; result: Record<string, number> },
): Promise<boolean> {
  const { count } = await tx.data_subject_requests.updateMany({
    where: { organization_id: organizationId, id, status: "RECEIVED" },
    data: { status: "COMPLETED", completed_by: input.by, completed_at: input.at, result: input.result },
  })
  return count === 1
}
