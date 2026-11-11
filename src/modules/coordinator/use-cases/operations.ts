/**
 * Use-case các thao tác điều phối P3–P7 (Chức năng 12). Mỗi thao tác: đọc đơn
 * → kiểm luật thuần (`domain/operation-rules.ts`) → ghi dữ liệu + chuyển bước
 * + `order_events` + `audit_logs` trong MỘT giao dịch.
 *
 *   assignPartner          F05  R4
 *   recordProductionUpdate F08  R3
 *   recordQcInspection     F10  R3
 *   recordDeliveryUpdate   F11/F12  R5
 *   closeCoordinatorOrder  F14  R3
 *   cancelCoordinatorOrder      R6 (trần cứng)
 */

import { AppError, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CoordinatorStage } from "../domain/coordinator-types"
import {
  checkCancellation,
  checkClosure,
  checkPartnerAssignment,
  checkProductionUpdate,
  checkQcDecision,
  defaultNextAction,
  exceptionCode,
  stageAfterQc,
  type QcDecision,
} from "../domain/operation-rules"
import { axesAfterTransition } from "../domain/stage-transitions"
import { getCoordinatorRepository, type CoordinatorRepository, type CoordinatorOrderRow } from "../infra/coordinator-repository"
import type { DbClient } from "../infra/transaction"
import { PendingPaymentRepository } from "../infra/pending-payment-repository"
import type { CoordinatorOrderView } from "./present-coordinator-order"
import {
  audit,
  concurrentUpdate,
  ensureAssetsOwned,
  ensureRule,
  ensureTransition,
  getOrderView,
  loadEditableOrderOrThrow,
  runCoordinatorTx,
} from "./shared"
import { returnStock } from "@/modules/orders/infra/order-stock"
import { releaseLeadOfCancelledOrder } from "@/modules/orders/infra/order-lead-link"

function currentAxes(row: CoordinatorOrderRow) {
  return { status: row.status, productionStatus: row.production_status, deliveryStatus: row.delivery_status }
}

export async function transition(
  ctx: TenantContext,
  repo: CoordinatorRepository,
  row: CoordinatorOrderRow,
  to: CoordinatorStage,
  reason: string,
  coordination: Parameters<CoordinatorRepository["applyTransition"]>[2]["coordination"] = {},
  nextAction?: string
): Promise<void> {
  const moved = await repo.applyTransition(ctx, row, {
    from: row.coordination!.stage,
    to,
    axes: axesAfterTransition(to, currentAxes(row)),
    nextAction: nextAction ?? defaultNextAction(to),
    reason,
    coordination,
  })
  if (!moved) throw concurrentUpdate()
}

/** Mở sự cố trong giao dịch đang chạy và đưa đơn về EXCEPTION (nhớ bước cũ). */
export async function openExceptionInTx(
  ctx: TenantContext,
  tx: DbClient,
  repo: CoordinatorRepository,
  row: CoordinatorOrderRow,
  data: { type: string; severity: string; description: string }
) {
  const seq = (await repo.countExceptions(ctx, row.id)) + 1
  const exception = await repo.createException(ctx, {
    orderId: row.id,
    code: exceptionCode(row.code, seq),
    ...data,
  })
  const from = row.coordination!.stage
  if (from !== "EXCEPTION") {
    await transition(ctx, repo, row, "EXCEPTION", `Sự cố ${data.type}`, { resume_stage: from }, `Xử lý sự cố: ${data.description}`)
  }
  await audit(ctx, tx, "coordinator.exception.open", row.id, { stage: from }, { exception: exception.code, type: data.type })
  return exception
}

// ── F05 · Phân công đối tác ───────────────────────────────────────────────

export async function assignPartner(
  ctx: TenantContext,
  orderIdOrCode: string,
  input: { partnerId: string; notes?: string | undefined; overrideCapacity?: boolean | undefined; agreedCraftFeeVnd?: number | undefined }
): Promise<CoordinatorOrderView> {
  const orderId = await runCoordinatorTx(async (tx) => {
    const repo = getCoordinatorRepository(tx)
    const row = await loadEditableOrderOrThrow(ctx, repo, orderIdOrCode)
    const partner = await repo.findPartner(ctx, input.partnerId)
    if (!partner) throw notFound()
    const stage = row.coordination!.stage
    ensureRule(checkPartnerAssignment({ stage, partnerActive: partner.is_active }))

    if (!input.overrideCapacity && row.coordination!.partner_id !== partner.id) {
      const load = await repo.countActiveOrdersForPartner(ctx, partner.id)
      if (load >= partner.capacity_daily) {
        throw new AppError("UNPROCESSABLE_ENTITY", `Đối tác đã nhận ${load}/${partner.capacity_daily} đơn đang chạy.`, {
          load,
          capacity: partner.capacity_daily,
        })
      }
    }

    const note = input.notes?.trim()
    const nextAction = `Xưởng ${partner.name} đang cắm theo BOM`
    const coordinationUpdates: Parameters<CoordinatorRepository["updateCoordination"]>[2] = {
      partner_id: partner.id,
      next_action: nextAction,
    }
    if (typeof input.agreedCraftFeeVnd === "number" && input.agreedCraftFeeVnd >= 0) {
      coordinationUpdates.partner_payout_vnd = input.agreedCraftFeeVnd
    }

    if (stage === "IN_PRODUCTION") {
      await repo.updateCoordination(ctx, row.id, coordinationUpdates)
    } else {
      await transition(ctx, repo, row, "IN_PRODUCTION", `Phân công ${partner.name}`, coordinationUpdates, nextAction)
    }

    const meta = (row.coordination!.metadata ?? {}) as Record<string, unknown>
    const nextMeta: Record<string, unknown> = { ...meta }
    if (note) {
      nextMeta.partnerInstruction = note
    }
    if (typeof input.agreedCraftFeeVnd === "number" && input.agreedCraftFeeVnd >= 0) {
      nextMeta.agreedCraftFeeVnd = input.agreedCraftFeeVnd
    }
    if (note || typeof input.agreedCraftFeeVnd === "number") {
      await repo.updateMetadata(ctx, row.id, nextMeta)
    }

    await audit(ctx, tx, "coordinator.partner.assign", row.id, { partnerId: row.coordination!.partner_id }, {
      partnerId: partner.id,
      agreedCraftFeeVnd: input.agreedCraftFeeVnd,
    })
    return row.id
  })
  return getOrderView(ctx, orderId)
}

// ── F08 · Tiến độ sản xuất ────────────────────────────────────────────────

export async function recordProductionUpdate(
  ctx: TenantContext,
  orderIdOrCode: string,
  input: {
    action: "UPDATE_PROGRESS" | "MARK_READY" | "REPORT_MATERIAL_ISSUE"
    progressPercent: number
    finishedAssetIds?: string[] | undefined
    issueNote?: string | undefined
  }
): Promise<CoordinatorOrderView> {
  const orderId = await runCoordinatorTx(async (tx) => {
    const repo = getCoordinatorRepository(tx)
    const row = await loadEditableOrderOrThrow(ctx, repo, orderIdOrCode)
    const stage = row.coordination!.stage

    if (input.action === "REPORT_MATERIAL_ISSUE") {
      if (stage !== "IN_PRODUCTION") {
        throw new AppError("UNPROCESSABLE_ENTITY", `Chỉ báo thiếu vật liệu khi đơn đang cắm (hiện: ${stage}).`)
      }
      if (!input.issueNote?.trim()) throw new AppError("UNPROCESSABLE_ENTITY", "Phải mô tả vật liệu thiếu.")
      await openExceptionInTx(ctx, tx, repo, row, {
        type: "MATERIAL_SHORTAGE",
        severity: "HIGH",
        description: input.issueNote.trim(),
      })
      return row.id
    }

    const finished = input.finishedAssetIds ?? []
    const markReady = input.action === "MARK_READY"
    ensureRule(
      checkProductionUpdate({ stage, progressPercent: input.progressPercent, markReady, finishedAssetCount: finished.length })
    )
    await ensureAssetsOwned(ctx, tx, finished)

    const data = {
      production_progress: markReady ? 100 : input.progressPercent,
      ...(finished.length > 0 ? { finished_asset_ids: finished } : {}),
    }
    if (markReady) {
      ensureTransition(stage, "QUALITY_CHECK", await repo.facts(ctx, row))
      await transition(ctx, repo, row, "QUALITY_CHECK", "Xưởng báo cắm xong", data)
    } else {
      await repo.updateCoordination(ctx, row.id, { ...data, next_action: `Xưởng hoàn thành ${input.progressPercent}%` })
    }
    await audit(ctx, tx, "coordinator.production.update", row.id, { progress: row.coordination!.production_progress }, data)
    return row.id
  })
  return getOrderView(ctx, orderId)
}

// ── F10 · QC ─────────────────────────────────────────────────────────────

export async function recordQcInspection(
  ctx: TenantContext,
  orderIdOrCode: string,
  input: { decision: QcDecision; notes?: string | undefined; checklist?: Record<string, boolean> | undefined }
): Promise<CoordinatorOrderView> {
  const orderId = await runCoordinatorTx(async (tx) => {
    const repo = getCoordinatorRepository(tx)
    const row = await loadEditableOrderOrThrow(ctx, repo, orderIdOrCode)
    const c = row.coordination!
    const images = Array.isArray(c.finished_asset_ids)
      ? (c.finished_asset_ids as unknown[]).filter((v): v is string => typeof v === "string")
      : []
    ensureRule(checkQcDecision({ stage: c.stage, decision: input.decision, notes: input.notes, imageCount: images.length }))

    const qc = await repo.createQcRecord(ctx, {
      orderId: row.id,
      status: input.decision,
      imageAssetIds: images,
      checklist: input.checklist ?? null,
      notes: input.notes?.trim() || null,
    })
    await audit(ctx, tx, "coordinator.qc.record", row.id, null, { qcId: qc.id, decision: input.decision })

    const next = stageAfterQc(input.decision)
    if (next === "EXCEPTION") {
      await openExceptionInTx(ctx, tx, repo, row, {
        type: "QC_FAILURE",
        severity: "HIGH",
        description: input.notes!.trim(),
      })
    } else if (next === "IN_PRODUCTION") {
      await transition(ctx, repo, row, "IN_PRODUCTION", "QC yêu cầu làm lại", { production_progress: 0 }, `Xưởng sửa lại: ${input.notes!.trim()}`)
    } else {
      // Bằng chứng QC PASSED vừa ghi trong cùng giao dịch.
      ensureTransition(c.stage, next, { ...(await repo.facts(ctx, row)), latestQcStatus: "PASSED" })
      await transition(ctx, repo, row, next, "QC đạt")
    }
    return row.id
  })
  return getOrderView(ctx, orderId)
}

// ── F14 · Đóng đơn / Huỷ ──────────────────────────────────────────────────

export async function closeCoordinatorOrder(
  ctx: TenantContext,
  orderIdOrCode: string,
  input: { partnerRating?: number | undefined; partnerPayoutVnd?: number | undefined; notes?: string | undefined },
  now = new Date()
): Promise<CoordinatorOrderView> {
  const orderId = await runCoordinatorTx(async (tx) => {
    const repo = getCoordinatorRepository(tx)
    const row = await loadEditableOrderOrThrow(ctx, repo, orderIdOrCode)
    const facts = await repo.facts(ctx, row)
    ensureRule(
      checkClosure({
        stage: row.coordination!.stage,
        openExceptionCount: facts.openExceptionCount,
        partnerRating: input.partnerRating,
        partnerPayoutVnd: input.partnerPayoutVnd,
        balanceVnd: Number(row.balance_vnd),
      })
    )
    ensureTransition(row.coordination!.stage, "COMPLETED", facts)
    const closure = {
      partner_rating: input.partnerRating ?? null,
      partner_payout_vnd: input.partnerPayoutVnd ?? null,
      closure_notes: input.notes?.trim() || null,
      closed_by: ctx.userId,
      closed_at: now,
    }
    await transition(ctx, repo, row, "COMPLETED", "Nghiệm thu và đóng đơn", closure)
    await audit(ctx, tx, "coordinator.order.close", row.id, { stage: "DELIVERED" }, {
      stage: "COMPLETED",
      partnerPayoutVnd: closure.partner_payout_vnd,
      partnerRating: closure.partner_rating,
    })
    return row.id
  })
  return getOrderView(ctx, orderId)
}

export async function cancelCoordinatorOrder(
  ctx: TenantContext,
  orderIdOrCode: string,
  input: { reason: string }
): Promise<CoordinatorOrderView> {
  const orderId = await runCoordinatorTx(async (tx) => {
    const repo = getCoordinatorRepository(tx)
    const row = await loadEditableOrderOrThrow(ctx, repo, orderIdOrCode)
    const from = row.coordination!.stage
    ensureRule(checkCancellation({ stage: from, reason: input.reason }))
    await transition(ctx, repo, row, "CANCELLED", `Huỷ đơn: ${input.reason.trim()}`, {
      cancelled_reason: input.reason.trim(),
      resume_stage: null,
    })
    // Khoản thu Sale ghi còn chờ xác nhận không được duyệt vào đơn đã huỷ (audit BL-21)
    const rejectedPending = await new PendingPaymentRepository(tx).rejectAllForOrder(ctx, row.id)
    await audit(ctx, tx, "coordinator.order.cancel", row.id, { stage: from }, { stage: "CANCELLED", reason: input.reason.trim(), rejectedPending })
    return row.id
  })
  // Hoàn tồn đã trừ lúc tạo đơn (PO 07/11/2026, Q9) — đánh dấu theo dòng nên gọi lại không hoàn hai lần
  await returnStock(ctx.organizationId, orderId)
  await releaseLeadOfCancelledOrder(ctx.organizationId, orderId)
  return getOrderView(ctx, orderId)
}
