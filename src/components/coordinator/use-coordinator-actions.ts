import { coordinatorApi, type CoordinationOrder } from "./coordinator-api"
import type { DeliveryEventInput } from "@/components/templates/coordinator/delivery-dispatch-modal"
import { fmtVnd, type DetailTab } from "./coordinator-helpers"

export interface UseCoordinatorActionsProps {
  selectedOrder: CoordinationOrder | null
  setSelectedId: (id: string) => void
  applyUpdate: (order: CoordinationOrder) => void
  openDetail: (order: CoordinationOrder, tab?: DetailTab) => void
  setNotice: (msg: string) => void
  setIsPlanningModalOpen: (open: boolean) => void
  setIsAssignModalOpen: (open: boolean) => void
  setIsProductionUpdateModalOpen: (open: boolean) => void
  setIsQcModalOpen: (open: boolean) => void
  setIsDispatchModalOpen: (open: boolean) => void
  setIsClosureModalOpen: (open: boolean) => void
  setIsCraftAcceptModalOpen: (open: boolean) => void
  setIsCraftCancelModalOpen: (open: boolean) => void
}

export function useCoordinatorActions({
  selectedOrder,
  setSelectedId,
  applyUpdate,
  openDetail,
  setNotice,
  setIsPlanningModalOpen,
  setIsAssignModalOpen,
  setIsProductionUpdateModalOpen,
  setIsQcModalOpen,
  setIsDispatchModalOpen,
  setIsClosureModalOpen,
  setIsCraftAcceptModalOpen,
  setIsCraftCancelModalOpen,
}: UseCoordinatorActionsProps) {
  const handleAdvanceStage = (order: CoordinationOrder) => {
    setSelectedId(order.id)
    switch (order.stage) {
      case "INTAKE":
      case "VALIDATING":
        setIsPlanningModalOpen(true)
        break
      case "PLANNING":
      case "ASSIGNING":
        setIsAssignModalOpen(true)
        break
      case "IN_PRODUCTION":
        setIsProductionUpdateModalOpen(true)
        break
      case "QUALITY_CHECK":
        setIsQcModalOpen(true)
        break
      case "DISPATCHING":
        setIsDispatchModalOpen(true)
        break
      case "DELIVERED":
        setIsClosureModalOpen(true)
        break
      case "EXCEPTION":
        openDetail(order, "EXCEPTION")
        break
      default:
        openDetail(order, "BRIEF")
    }
  }

  const onConfirmPlan = async (nextAction: string) => {
    if (!selectedOrder) return
    applyUpdate(await coordinatorApi.updateStage(selectedOrder.id, "PLANNING", nextAction))
    setIsPlanningModalOpen(false)
    setIsAssignModalOpen(true)
  }

  const onAssignPartner = async (partnerId: string, notes: string, overrideCapacity: boolean) => {
    if (!selectedOrder) return
    applyUpdate(
      await coordinatorApi.assignPartner(selectedOrder.id, {
        partnerId,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(overrideCapacity ? { overrideCapacity } : {}),
      })
    )
    setIsAssignModalOpen(false)
  }

  const onProductionUpdate = async (params: {
    progressPercent: number
    action: "UPDATE_PROGRESS" | "REPORT_MATERIAL_ISSUE" | "MARK_READY"
    finishedAssetIds?: string[] | undefined
    issueNote?: string | undefined
  }) => {
    if (!selectedOrder) return
    const order = await coordinatorApi.production(selectedOrder.id, {
      action: params.action,
      progressPercent: params.progressPercent,
      ...(params.finishedAssetIds ? { finishedAssetIds: params.finishedAssetIds } : {}),
      ...(params.issueNote ? { issueNote: params.issueNote } : {}),
    })
    applyUpdate(order)
    setIsProductionUpdateModalOpen(false)
    if (order.stage === "QUALITY_CHECK") setIsQcModalOpen(true)
    if (order.stage === "EXCEPTION") openDetail(order, "EXCEPTION")
  }

  const onQc = async (
    decision: "PASSED" | "REWORK_REQUESTED" | "REJECTED",
    notes: string,
    checklist: Record<string, boolean>
  ) => {
    if (!selectedOrder) return
    const order = await coordinatorApi.qc(selectedOrder.id, { decision, ...(notes ? { notes } : {}), checklist })
    applyUpdate(order)
    setIsQcModalOpen(false)
    if (order.stage === "DISPATCHING") setIsDispatchModalOpen(true)
    if (order.stage === "EXCEPTION") openDetail(order, "EXCEPTION")
  }

  const onDelivery = async (input: DeliveryEventInput) => {
    if (!selectedOrder) return
    const order = await coordinatorApi.delivery(selectedOrder.id, input)
    applyUpdate(order)
    if (order.stage === "DELIVERED") {
      setIsDispatchModalOpen(false)
      setIsClosureModalOpen(true)
    } else if (order.stage === "EXCEPTION") {
      setIsDispatchModalOpen(false)
      openDetail(order, "EXCEPTION")
    }
  }

  const onCloseOrder = async (input: { partnerRating?: number; partnerPayoutVnd?: number; payoutReason?: string; notes?: string }) => {
    if (!selectedOrder) return
    const order = await coordinatorApi.close(selectedOrder.id, input)
    applyUpdate(order)
    setIsClosureModalOpen(false)
    setNotice(`Đơn #${order.orderCode} đã nghiệm thu và đóng.`)
  }

  const onCraftAccept = async (data: { partnerId: string; agreedCraftFeeVnd: number; notes?: string | undefined }) => {
    if (!selectedOrder) return
    const updated = await coordinatorApi.assignPartner(selectedOrder.id, {
      partnerId: data.partnerId,
      agreedCraftFeeVnd: data.agreedCraftFeeVnd,
      ...(data.notes ? { notes: data.notes } : {}),
    })
    applyUpdate(updated)
    setNotice(`Đã chốt nhận đơn #${updated.orderCode} với giá gia công ${fmtVnd(data.agreedCraftFeeVnd)}.`)
    setIsCraftAcceptModalOpen(false)
  }

  const onCraftCancel = async (reason: string) => {
    if (!selectedOrder) return
    const updated = await coordinatorApi.cancel(selectedOrder.id, reason)
    applyUpdate(updated)
    setNotice(`Đã hủy nhận đơn gia công #${updated.orderCode}.`)
    setIsCraftCancelModalOpen(false)
  }

  return {
    handleAdvanceStage,
    onConfirmPlan,
    onAssignPartner,
    onProductionUpdate,
    onQc,
    onDelivery,
    onCloseOrder,
    onCraftAccept,
    onCraftCancel,
  }
}
