import type { TenantContext } from "@/core/tenancy"
import { notFound } from "@/core/http/errors"
import { getCurrentOrganization } from "@/modules/organization/use-cases/get-current-organization"
import { TrackingPipelineRepository, getTrackingPipelineRepository } from "../infra/tracking-pipeline-repository"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { GreetingMessageRepository, getGreetingMessageRepository } from "../infra/greeting-message-repository"
import { parseStepSla } from "../domain/step-sla"
import { EVENT_ENTERS_STEP, EVENT_LABEL, stepSegments, type TimelineEvent } from "../domain/tracking-timeline"
import { paginate } from "../domain/tracking-views"
import { visibleTarget } from "./internal-messages"

const event = (kind: string, at: Date, actorId: string | null = null, note: string | null = null): TimelineEvent => ({
  at: at.toISOString(), kind, label: EVENT_LABEL[kind] ?? kind, entersStep: EVENT_ENTERS_STEP[kind] ?? null, actorId, note,
})

/**
 * Dòng thời gian của MỘT đơn/link: sự kiện (phân trang) + các đoạn ở từng bước so với thời gian chuẩn.
 * Cùng phạm vi xem với mọi view (sale "chỉ khách của mình" → 404 với đơn người khác).
 * Kèm imageUrls cho sự kiện ảnh thành phẩm, ảnh người nhận, và ảnh chuyển khoản.
 */
export async function getTrackingTimeline(
  ctx: TenantContext,
  ref: { orderId?: string | undefined; sessionId?: string | undefined },
  page: { limit: number; cursor?: string | undefined },
  now = new Date(),
  repo = getTrackingPipelineRepository(),
) {
  await visibleTarget(ctx, ref, getGreetingMessageRepository())
  const src = await repo.timelineSource(ctx, ref)
  if (!src) throw notFound()

  const events: TimelineEvent[] = []
  const s = src.session
  if (s) {
    const copied = s.events.some((e) => e.event_type === "LINK_COPIED")
    events.push({ ...event("LINK_CREATED", s.created_at), entersStep: copied ? null : "STEP_1_OPENED" })
    for (const e of s.events) {
      if (e.event_type === "SUBMIT_ORDER" && src.order) continue
      const meta = e.metadata as Record<string, unknown> | null
      events.push(event(e.event_type, e.created_at, typeof meta?.["copiedBy"] === "string" ? (meta["copiedBy"] as string) : null))
    }
  }
  if (src.order) {
    events.push(event("SUBMIT_ORDER", src.order.created_at))
    for (const e of src.order.events) {
      if (e.axis === "internal_note") continue
      const kind = e.reason === "BROCHURE_PAYMENT_CONFIRMED" ? "PAYMENT_FIRST" : e.to_value === "CANCELLED" ? "ORDER_CANCELLED" : e.reason ?? e.to_value
      events.push(event(kind, e.created_at, e.actor_id, kind === "ORDER_CANCELLED" ? e.reason : null))
    }
    for (const p of src.order.payments) {
      const amount = `${Number(p.amount_vnd).toLocaleString("vi-VN")} đ`
      events.push({ ...event(p.kind === "REFUND" ? "REFUND" : "PAYMENT", p.collected_at, p.collected_by), note: amount })
    }
    // QC records: ảnh thành phẩm và ảnh người nhận
    for (const qc of src.order.qc_records ?? []) {
      if (qc.notes === "PRODUCT_PHOTO_UPLOADED" || qc.notes === "RECIPIENT_PHOTO_UPLOADED") {
        const kind = qc.notes
        const ev = event(kind, qc.created_at)
        events.push({ ...ev, label: EVENT_LABEL[kind] ?? kind })
      }
    }
  }
  events.sort((a, b) => a.at.localeCompare(b.at) || a.kind.localeCompare(b.kind))

  // Loại bỏ sự kiện QC trùng lặp (đã push từ order.events + qc_records) — giữ bản QC chứa imageUrls
  const dedupedEvents = events.filter((ev, i, arr) => {
    if (ev.kind !== "PRODUCT_PHOTO_UPLOADED" && ev.kind !== "RECIPIENT_PHOTO_UPLOADED") return true
    // Chỉ giữ bản đầu tiên theo kind + at (giây)
    const first = arr.findIndex((e2) => e2.kind === ev.kind && e2.at.slice(0, 16) === ev.at.slice(0, 16))
    return first === i
  })

  // Batch-resolve signed URLs cho ảnh (tránh N+1)
  const orgId = ctx.organizationId
  const assetIds: string[] = []
  const productAssetIdsByMinute = new Map<string, string[]>()
  const recipientAssetIdsByMinute = new Map<string, string[]>()

  for (const qc of src.order?.qc_records ?? []) {
    const ids = Array.isArray(qc.image_asset_ids) ? (qc.image_asset_ids as string[]).filter((x): x is string => typeof x === "string") : []
    if (ids.length === 0) continue
    const minute = qc.created_at.toISOString().slice(0, 16)
    if (qc.notes === "PRODUCT_PHOTO_UPLOADED") productAssetIdsByMinute.set(minute, ids)
    if (qc.notes === "RECIPIENT_PHOTO_UPLOADED") recipientAssetIdsByMinute.set(minute, ids)
    assetIds.push(...ids)
  }

  // Proof asset IDs từ session
  const proofId = s?.payment_proof_asset_id
  const proofBalanceId = s?.payment_proof_balance_asset_id
  if (proofId) assetIds.push(proofId)
  if (proofBalanceId) assetIds.push(proofBalanceId)

  const urlMap = assetIds.length > 0
    ? await getGreetingCardRepository().getAssetsStorageMap(orgId, assetIds)
    : new Map<string, string>()

  // Gắn imageUrls vào event tương ứng
  const toUrls = (ids: string[]) => ids.map((id) => urlMap.get(id)).filter((u): u is string => Boolean(u))

  const eventsWithImages = dedupedEvents.map((ev) => {
    if (ev.kind === "PRODUCT_PHOTO_UPLOADED") {
      const minute = ev.at.slice(0, 16)
      const ids = productAssetIdsByMinute.get(minute) ?? []
      return { ...ev, imageUrls: toUrls(ids) }
    }
    if (ev.kind === "RECIPIENT_PHOTO_UPLOADED") {
      const minute = ev.at.slice(0, 16)
      const ids = recipientAssetIdsByMinute.get(minute) ?? []
      return { ...ev, imageUrls: toUrls(ids) }
    }
    if (ev.kind === "CLICK_PAID") {
      // Gắn ảnh chuyển khoản theo thứ tự thời gian (lần 1 trước)
      const clickPaidEvents = dedupedEvents.filter((e) => e.kind === "CLICK_PAID")
      const idx = clickPaidEvents.indexOf(ev)
      const proofUrl = idx === 0 && proofId ? urlMap.get(proofId) : idx === 1 && proofBalanceId ? urlMap.get(proofBalanceId) : undefined
      return proofUrl ? { ...ev, imageUrls: [proofUrl] } : ev
    }
    return ev
  })

  const sla = parseStepSla((await getCurrentOrganization(ctx))?.settings)
  return {
    orderId: src.order?.id ?? null,
    sessionId: s?.id ?? null,
    segments: stepSegments(eventsWithImages, sla, now),
    events: paginate(eventsWithImages, page.limit, page.cursor),
    // Tất cả URL ảnh để trang in dùng lại không cần fetch lại
    allImageUrls: {
      productPhotoUrls: [...productAssetIdsByMinute.values()].flatMap(toUrls),
      recipientPhotoUrls: [...recipientAssetIdsByMinute.values()].flatMap(toUrls),
      paymentProofUrl: proofId ? (urlMap.get(proofId) ?? null) : null,
      paymentProofBalanceUrl: proofBalanceId ? (urlMap.get(proofBalanceId) ?? null) : null,
    },
  }
}

