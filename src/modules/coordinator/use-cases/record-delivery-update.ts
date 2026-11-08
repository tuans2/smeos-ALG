import type { TenantContext } from "@/core/tenancy/tenant-context"
import { parseBrochureWorkflowPolicy } from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { getCurrentOrganization } from "@/modules/organization/use-cases/get-current-organization"
import { checkDeliveryUpdate, deliveryStatusFor, type DeliveryEvent } from "../domain/operation-rules"
import { getCoordinatorRepository } from "../infra/coordinator-repository"
import { openExceptionInTx, transition } from "./operations"
import type { CoordinatorOrderView } from "./present-coordinator-order"
import { audit, ensureAssetsOwned, ensureRule, ensureTransition, getOrderView, loadEditableOrderOrThrow, runCoordinatorTx } from "./shared"

/**
 * F11/F12 · Giao hàng (`R5`). Tách khỏi `operations.ts` (giữ tệp dưới ngưỡng 350 dòng). Ảnh giao
 * hàng bắt buộc theo chính sách cửa hàng — checklist ALG 4.18.
 */
export async function recordDeliveryUpdate(
  ctx: TenantContext,
  orderIdOrCode: string,
  input: {
    event: DeliveryEvent
    carrier?: string | undefined
    shipperName: string
    shipperPhone?: string | undefined
    podAssetId?: string | undefined
    recipientSignedName?: string | undefined
    failureReason?: string | undefined
  },
  now = new Date()
): Promise<CoordinatorOrderView> {
  // Ảnh giao bắt buộc trừ khi Điều hành đã tắt yêu cầu trong Cài đặt (checklist ALG 4.18)
  const requirePodPhoto = parseBrochureWorkflowPolicy((await getCurrentOrganization(ctx))?.settings).requireDeliveryProofPhoto
  const orderId = await runCoordinatorTx(async (tx) => {
    const repo = getCoordinatorRepository(tx)
    const row = await loadEditableOrderOrThrow(ctx, repo, orderIdOrCode)
    const c = row.coordination!
    ensureRule(
      checkDeliveryUpdate({
        requirePodPhoto,
        stage: c.stage,
        currentState: c.delivery_state,
        event: input.event,
        shipperName: input.shipperName,
        podAssetId: input.podAssetId,
        recipientSignedName: input.recipientSignedName,
        failureReason: input.failureReason,
      })
    )
    if (input.podAssetId) await ensureAssetsOwned(ctx, tx, [input.podAssetId])

    const shipper = {
      shipper_name: input.shipperName.trim(),
      shipper_phone: input.shipperPhone?.trim() || c.shipper_phone,
      carrier: input.carrier?.trim() || c.carrier,
      delivery_state: input.event,
    }
    const deliveryStatus = deliveryStatusFor(input.event)
    if (deliveryStatus !== row.delivery_status) {
      await repo.updateOrderAxis(ctx, row.id, { delivery_status: deliveryStatus })
      await repo.recordEvent(ctx, row.id, "delivery", row.delivery_status, deliveryStatus, `Giao hàng: ${input.event}`)
    }
    // `applyTransition` đọc trục delivery từ `row`; sự kiện vừa đổi nó.
    const current = { ...row, delivery_status: deliveryStatus }

    if (input.event === "DELIVERED_SUCCESS") {
      const pod = {
        ...shipper,
        pod_asset_id: input.podAssetId ?? null,
        pod_recipient_name: input.recipientSignedName?.trim() || null,
        pod_captured_at: now,
        actual_delivery_at: now,
      }
      ensureTransition(c.stage, "DELIVERED", { ...(await repo.facts(ctx, row)), podCaptured: true })
      await transition(ctx, repo, current, "DELIVERED", "Giao thành công, có POD", pod)
    } else if (input.event === "DELIVERY_FAILED") {
      await repo.updateCoordination(ctx, row.id, shipper)
      await openExceptionInTx(ctx, tx, repo, current, {
        type: "DELIVERY_FAILURE",
        severity: "CRITICAL",
        description: input.failureReason!.trim(),
      })
    } else {
      await repo.updateCoordination(ctx, row.id, {
        ...shipper,
        next_action: input.event === "PICKED_UP" ? "Shipper đã lấy hàng" : "Shipper đang trên đường tới người nhận",
      })
    }
    await audit(ctx, tx, "coordinator.delivery.update", row.id, { state: c.delivery_state }, { state: input.event })
    return row.id
  })
  return getOrderView(ctx, orderId)
}
