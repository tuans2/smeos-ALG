import { conflict, notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import {
  buildFlowerProposal,
  buildFlowerResponse,
  flowerForCustomer,
  flowerInternalNote,
  secondaryFlowerLines,
  FLOWER_CHOICE_LABEL,
  type FlowerProposalInput,
  type FlowerSubstitutePayload,
} from "../domain/flower-substitute"
import { substituteLockReason } from "../domain/substitute-proposal"
import { type FlowerSubstituteRepository, getFlowerSubstituteRepository } from "../infra/flower-substitute-repository"
import { type SubstituteRepository, getSubstituteRepository } from "../infra/substitute-repository"
import { type OrderChangeRepository, getOrderChangeRepository } from "../infra/order-change-repository"
import { getGreetingCardRepository } from "../infra/greeting-card-repository"
import { isVerifiedCustomer, type ChangeProof } from "./order-change"
import { queueOrderNotification } from "./notify-customer"

type Loose = Record<string, unknown>
const obj = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {})

async function loadOrder(ctx: TenantContext, orderId: string, orders: SubstituteRepository) {
  const order = await orders.orderForStaff(ctx, orderId)
  if (!order) throw notFound()
  const item = order.items[0]
  const productName = (typeof obj(item?.metadata).name === "string" ? (obj(item?.metadata).name as string) : null) || item?.description || "Mẫu đã chọn"
  return { order, item, productName, saleId: order.greeting_sessions[0]?.sale_id ?? null }
}

/** Màn đề xuất đổi hoa của nhân viên (R3): các dòng hoa phụ trong công thức đơn, đề xuất gần nhất. */
export async function flowerSubstituteOptions(
  ctx: TenantContext, orderId: string,
  orders = getSubstituteRepository(), repo = getFlowerSubstituteRepository(),
) {
  const { order, item, productName } = await loadOrder(ctx, orderId, orders)
  const latest = (await repo.listForOrder(ctx.organizationId, order.id))[0]
  return {
    productName,
    lines: secondaryFlowerLines(item?.metadata),
    lockedReason: substituteLockReason({ status: order.status, deliveryStatus: order.delivery_status }),
    latest: latest ? { id: latest.id, ...latest.payload } : null,
  }
}

/** Nhân viên (R3) gửi đề xuất đổi một loại hoa phụ kèm ảnh hoa thay thế và lý do; báo khách. */
export async function proposeFlowerSubstitute(
  ctx: TenantContext, orderId: string, input: FlowerProposalInput,
  orders = getSubstituteRepository(), repo: FlowerSubstituteRepository = getFlowerSubstituteRepository(), now = new Date(),
) {
  const { order, item, productName, saleId } = await loadOrder(ctx, orderId, orders)
  const lock = substituteLockReason({ status: order.status, deliveryStatus: order.delivery_status })
  if (lock) throw conflict(lock)
  const photoOk = input.photoAssetId ? await repo.photoBelongs(ctx, input.photoAssetId) : false
  const built = buildFlowerProposal(input, item?.metadata, photoOk)
  if (!built.ok) throw validationFailed(built.errors)
  const payload: FlowerSubstitutePayload = {
    kind: "FLOWER", status: "PENDING", reason: built.reason, productName, line: built.line, replacement: built.replacement,
    proposedBy: ctx.userId, proposedAt: now.toISOString(),
  }
  const body = `Đề xuất đổi hoa "${built.line.flowerName}" → "${built.replacement.flowerName}" — ${built.reason}`
  const created = await repo.createProposal(ctx, { id: order.id, saleId }, payload, body)
  queueOrderNotification(ctx.organizationId, order.id, "SUBSTITUTE_PROPOSED")
  return { id: created.id, ...payload }
}

/** Phần "Đề xuất đổi hoa" trên trang theo dõi (chỉ người đặt đã xác minh), ảnh qua URL ký. */
export async function customerFlowerSection(order: { id: string; organization_id: string }, repo = getFlowerSubstituteRepository()) {
  const rows = await repo.listForOrder(order.organization_id, order.id)
  if (rows.length === 0) return null
  const urls = await getGreetingCardRepository().getAssetsStorageMap(order.organization_id, rows.map((r) => r.payload.replacement.photoAssetId))
  const history = rows.map((r) => flowerForCustomer(r.id, r.payload, urls.get(r.payload.replacement.photoAssetId) ?? null))
  return { pending: history.find((h) => h.status === "PENDING") ?? null, history }
}

/**
 * Khách trả lời từ trang theo dõi. Không chứng minh được là người đặt, sai mã, hay đề xuất không còn
 * chờ → 404. Hoa đã giao shipper → 409.
 */
export async function respondFlowerSubstitute(
  request: Request, orderCode: string, proof: ChangeProof,
  input: { proposalId: string; choice: string; note?: string | undefined },
  repo = getFlowerSubstituteRepository(), orders: OrderChangeRepository = getOrderChangeRepository(), now = new Date(),
) {
  const order = await orders.findPublicOrder(orderCode)
  if (!order || !isVerifiedCustomer(request, order, proof)) throw notFound()
  const proposal = (await repo.listForOrder(order.organization_id, order.id)).find((r) => r.id === input.proposalId)
  if (!proposal || proposal.payload.status !== "PENDING") throw notFound()
  const lock = substituteLockReason({ status: order.status, deliveryStatus: order.delivery_status })
  if (lock) throw conflict(`${lock} Vui lòng liên hệ cửa hàng.`)
  const answer = buildFlowerResponse(input)
  if (!answer.ok) throw validationFailed(answer.errors)
  const answered: FlowerSubstitutePayload = {
    ...proposal.payload, status: "ANSWERED", choice: answer.choice, answeredAt: now.toISOString(),
    ...(answer.note ? { customerNote: answer.note } : {}),
  }
  await repo.respond(order, {
    proposalId: proposal.id, answered, internalNote: flowerInternalNote(proposal.payload, answer),
    body: `${FLOWER_CHOICE_LABEL[answer.choice]}${answer.note ? ` — "${answer.note}"` : ""}`,
  })
  return flowerForCustomer(proposal.id, answered, null)
}
