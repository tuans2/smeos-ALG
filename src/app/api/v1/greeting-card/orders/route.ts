import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { BrochureOrderRepository, ORDER_STATUSES } from "@/modules/greeting-card/infra/brochure-order-repository"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { CancellationFollowUpRepository } from "@/modules/greeting-card/infra/cancellation-follow-up-repository"
import { parseListQuery, toPage } from "@/modules/greeting-card/contracts/list-query"
import { resolveSaleScope } from "@/modules/greeting-card/use-cases/order-scope"
import { withOrderProduct } from "@/modules/greeting-card/use-cases/order-product-views"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { parseDeliveryDate } from "@/modules/orders/domain/order-list-filter"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const statusParam = url.searchParams.get("status") || undefined
    const status = ORDER_STATUSES.find((s) => s === statusParam)
    if (statusParam && !status) throw validationFailed({ status: `Phải là một trong: ${ORDER_STATUSES.join(", ")}` })

    const paymentParam = url.searchParams.get("payment") || undefined
    const payment = (["OUTSTANDING", "PAID"] as const).find((p) => p === paymentParam)
    if (paymentParam && !payment) throw validationFailed({ payment: "Phải là OUTSTANDING hoặc PAID" })
    const { limit, cursor } = parseListQuery(url)
    const q = url.searchParams.get("q")?.trim().slice(0, 40) || undefined
    const reported = url.searchParams.get("reported") === "1"
    const delivered = url.searchParams.get("delivered") === "1"
    // Mở đúng một đơn từ Hộp việc — bỏ qua bộ lọc tab, vẫn trong phạm vi tiệm + sale
    const orderId = url.searchParams.get("orderId")?.trim().slice(0, 64) || undefined

    // Lọc nâng cao (checklist ALG 4.3): ngày giao, nhân viên bán, chi nhánh. Sale "chỉ khách của mình" luôn bị giới hạn về mình.
    const deliveryFrom = parseDeliveryDate(url.searchParams.get("delivery_from"))
    const deliveryTo = parseDeliveryDate(url.searchParams.get("delivery_to"))
    const branchId = url.searchParams.get("branch_id")?.trim().slice(0, 64) || undefined
    const repo = new BrochureOrderRepository()
    const saleId = (await resolveSaleScope(ctx)) ?? (url.searchParams.get("sale_id")?.trim().slice(0, 64) || undefined)
    const rows = await repo.listBrochureOrders(ctx, { status, payment, saleId, q, reported, delivered, orderId, limit, cursor, deliveryFrom, deliveryTo, branchId })

    // Batch-resolve ảnh chuyển khoản và kết quả phân tích AI (tránh N+1) — chỉ ký asset của đúng tổ chức
    const proofAssetIds = rows
      .flatMap((o) => [
        o.greeting_sessions[0]?.payment_proof_asset_id,
        o.greeting_sessions[0]?.payment_proof_balance_asset_id,
      ])
      .filter((id): id is string => typeof id === "string" && id.length > 0)

    const proofAssetsMap = proofAssetIds.length > 0
      ? await new GreetingCardRepository().getPaymentProofAssetsMap(ctx.organizationId, proofAssetIds)
      : new Map<string, { url: string; analysis?: unknown }>()

    // Đơn có khoản hoàn chờ ở "Cần hoàn tiền" — bảng Điều hành ẩn nút Hoàn tiền để không ghi trùng
    const pendingRefunds = await new CancellationFollowUpRepository().pendingRefundsByOrder(ctx, rows.map((o) => o.id))

    const rowsWithProof = rows.map((o) => {
      const proof1 = o.greeting_sessions[0]?.payment_proof_asset_id
        ? proofAssetsMap.get(o.greeting_sessions[0].payment_proof_asset_id)
        : null
      const proof2 = o.greeting_sessions[0]?.payment_proof_balance_asset_id
        ? proofAssetsMap.get(o.greeting_sessions[0].payment_proof_balance_asset_id)
        : null

      return {
        ...o,
        paymentProofUrl: proof1?.url ?? null,
        paymentProofAnalysis: proof1?.analysis ?? null,
        paymentProofBalanceUrl: proof2?.url ?? null,
        paymentProofBalanceAnalysis: proof2?.analysis ?? null,
        pending_refund_vnd: pendingRefunds.get(o.id) ?? null,
      }
    })

    return jsonResponse(toPage(await withOrderProduct(ctx, rowsWithProof), limit))
  },
})

