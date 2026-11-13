import { conflict, notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import {
  buildSubstituteProposal,
  buildSubstituteResponse,
  substituteForCustomer,
  substituteInternalNote,
  substituteLockReason,
  SUBSTITUTE_CHOICE_LABEL,
  type ResponseInput,
  type SubstituteOption,
  type SubstitutePayload,
} from "../domain/substitute-proposal"
import { SubstituteRepository, getSubstituteRepository } from "../infra/substitute-repository"
import { OrderChangeRepository, getOrderChangeRepository } from "../infra/order-change-repository"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { collectImageAssetIds, toCatalogProduct } from "./brochure-product-mapper"
import { isVerifiedCustomer, type ChangeProof } from "./order-change"
import { queueOrderNotification } from "./notify-customer"

type Loose = Record<string, unknown>
const obj = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {})
const str = (v: unknown) => (typeof v === "string" ? v : "")

async function loadStaffOrder(ctx: TenantContext, orderId: string, repo: SubstituteRepository) {
  const order = await repo.orderForStaff(ctx, orderId)
  if (!order) throw notFound()
  const item = order.items[0]
  const meta = obj(item?.metadata)
  const current = { productId: item?.product_id ?? str(meta.id), name: str(meta.name) || item?.description || "Mẫu đã chọn" }
  return { order, current, catalogId: order.greeting_sessions[0]?.catalog_id ?? null, saleId: order.greeting_sessions[0]?.sale_id ?? null }
}

/** Mẫu còn bán trong bộ sưu tập của đơn, trừ mẫu đang đặt — máy chủ tự dựng, không tin client. */
async function catalogOptions(ctx: TenantContext, catalogId: string | null, currentProductId: string, repo: SubstituteRepository): Promise<SubstituteOption[]> {
  if (!catalogId) return []
  const items = await repo.catalogItems(ctx, catalogId)
  const urls = await getGreetingCardRepository().getAssetsStorageMap(ctx.organizationId, collectImageAssetIds(items))
  return items
    .map((item) => toCatalogProduct(item, urls))
    .filter((p) => p.available !== false && p.id !== currentProductId)
    .map((p) => ({ productId: p.id, code: p.code, name: p.name, imageUrl: p.imageUrl, driveLink: p.driveLink ?? null, priceVnd: p.price ?? 0 }))
}

/** Màn đề xuất của nhân viên (R3): mẫu đang đặt, mẫu có thể thay, đề xuất gần nhất. */
export async function substituteOptions(ctx: TenantContext, orderId: string, repo = getSubstituteRepository()) {
  const { order, current, catalogId } = await loadStaffOrder(ctx, orderId, repo)
  const [options, history] = await Promise.all([
    catalogOptions(ctx, catalogId, current.productId, repo),
    repo.listForOrder(ctx.organizationId, order.id),
  ])
  const latest = history[0]
  return {
    current,
    lockedReason: substituteLockReason({ status: order.status, deliveryStatus: order.delivery_status }),
    options,
    latest: latest ? { id: latest.id, ...latest.payload } : null,
  }
}

/** Nhân viên (R3) gửi 1–3 mẫu thay thế kèm lý do; báo khách qua kênh thông báo đã bật. */
export async function proposeSubstitute(
  ctx: TenantContext,
  orderId: string,
  input: { reason: string; productIds: string[] },
  repo = getSubstituteRepository(),
  now = new Date(),
) {
  const { order, current, catalogId, saleId } = await loadStaffOrder(ctx, orderId, repo)
  const lock = substituteLockReason({ status: order.status, deliveryStatus: order.delivery_status })
  if (lock) throw conflict(lock)
  const built = buildSubstituteProposal(input, current.productId, await catalogOptions(ctx, catalogId, current.productId, repo))
  if (!built.ok) throw validationFailed(built.errors)
  const payload: SubstitutePayload = {
    status: "PENDING", reason: built.reason, original: current, options: built.options, proposedBy: ctx.userId, proposedAt: now.toISOString(),
  }
  const body = `Đề xuất đổi mẫu "${current.name}" → ${built.options.map((o) => o.name).join(" / ")} — ${built.reason}`
  const created = await repo.createProposal(ctx, { id: order.id, saleId }, payload, body)
  queueOrderNotification(ctx.organizationId, order.id, "SUBSTITUTE_PROPOSED")
  return { id: created.id, ...payload }
}

/** Phần "Đề xuất đổi mẫu" trên trang theo dõi (chỉ người đặt đã xác minh). */
export async function customerSubstituteSection(order: { id: string; organization_id: string }, repo = getSubstituteRepository()) {
  const rows = await repo.listForOrder(order.organization_id, order.id)
  if (rows.length === 0) return null
  const history = rows.map((r) => substituteForCustomer(r.id, r.payload))
  return { pending: history.find((h) => h.status === "PENDING") ?? null, history }
}

/**
 * Khách trả lời từ trang theo dõi. Không chứng minh được là người đặt, sai mã, hay đề xuất không
 * còn chờ → 404. Hoa đã giao shipper → 409.
 */
export async function respondSubstitute(
  request: Request,
  orderCode: string,
  proof: ChangeProof,
  input: ResponseInput & { proposalId: string },
  repo = getSubstituteRepository(),
  orders = getOrderChangeRepository(),
  now = new Date(),
) {
  const order = await orders.findPublicOrder(orderCode)
  if (!order || !isVerifiedCustomer(request, order, proof)) throw notFound()
  const proposal = (await repo.listForOrder(order.organization_id, order.id)).find((r) => r.id === input.proposalId)
  if (!proposal || proposal.payload.status !== "PENDING") throw notFound()
  const lock = substituteLockReason({ status: order.status, deliveryStatus: order.delivery_status })
  if (lock) throw conflict(`${lock} Vui lòng liên hệ cửa hàng.`)

  const answer = buildSubstituteResponse(proposal.payload, input)
  if (!answer.ok) throw validationFailed(answer.errors)
  const answered: SubstitutePayload = {
    ...proposal.payload, status: "ANSWERED", choice: answer.choice, answeredAt: now.toISOString(),
    ...(answer.option ? { chosenProductId: answer.option.productId } : {}),
    ...(answer.note ? { customerNote: answer.note } : {}),
  }
  const internalNote = substituteInternalNote(proposal.payload, answer)
  await repo.respond(order, {
    proposalId: proposal.id, answered, option: answer.option, internalNote,
    body: `${SUBSTITUTE_CHOICE_LABEL[answer.choice]}${answer.option ? `: ${answer.option.name}` : ""}${answer.note ? ` — "${answer.note}"` : ""}`,
  })
  return substituteForCustomer(proposal.id, answered)
}
