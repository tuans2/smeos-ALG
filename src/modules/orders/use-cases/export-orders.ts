/**
 * Use-case: Xuất danh sách đơn hàng ra Excel.
 *
 * Phạm vi:
 *   • Đơn hàng chính (orders) + chi tiết sản phẩm (order_items)
 *   • Thông tin khách hàng (customers)
 *   • Sổ thu / thanh toán (order_payments)
 *   • Phiên Thẻ Chào liên kết (greeting_sessions)
 *   • Lọc theo khoảng ngày (fromDate–toDate, UTC+7) và nguồn (source)
 *   • Giới hạn tối đa 5000 dòng
 */

import type { TenantContext } from "@/core/tenancy"
import { queryOrdersForExport } from "../infra/order-export-query"
import { resolveSaleScope } from "@/modules/greeting-card/use-cases/order-scope"
import * as XLSX from "xlsx"

const VN_OFFSET_MS = 7 * 60 * 60 * 1000

function toVnDateString(date: Date | null): string {
  if (!date) return ""
  const vn = new Date(date.getTime() + VN_OFFSET_MS)
  return vn.toISOString().replace("T", " ").slice(0, 19)
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "Nháp",
    CONFIRMED: "Đã xác nhận",
    PROCESSING: "Đang làm",
    DELIVERED: "Đã giao",
    COMPLETED: "Hoàn tất",
    CANCELLED: "Đã huỷ",
  }
  return map[status] ?? status
}

function productionLabel(s: string): string {
  const map: Record<string, string> = {
    WAITING: "Chờ làm",
    ASSIGNED: "Đã phân công",
    ARRANGING: "Đang cắm",
    QUALITY_CHECK: "Kiểm tra QC",
    READY: "Xong",
  }
  return map[s] ?? s
}

function deliveryLabel(s: string): string {
  const map: Record<string, string> = {
    PENDING: "Chờ giao",
    DISPATCHED: "Đã xuất kho",
    DELIVERING: "Đang giao",
    DELIVERED: "Đã giao",
    FAILED: "Giao thất bại",
  }
  return map[s] ?? s
}

function sourceLabel(s: string | null): string {
  const map: Record<string, string> = {
    MANUAL: "Nhập tay",
    CHAT: "Chat",
    BROCHURE: "Bộ sưu tập riêng",
  }
  return (s && map[s]) ?? (s ?? "Khác")
}

export interface ExportOrdersInput {
  fromDate?: string | undefined // YYYY-MM-DD
  toDate?: string | undefined   // YYYY-MM-DD
  /** Lọc theo kênh: BROCHURE | MANUAL | CHAT (mặc định: tất cả) */
  source?: string | undefined
}

export async function exportOrdersToExcel(
  ctx: TenantContext,
  input: ExportOrdersInput
): Promise<Uint8Array> {
  const parsedFrom = input.fromDate ? new Date(new Date(input.fromDate + "T00:00:00+07:00").getTime()) : undefined
  const parsedTo = input.toDate ? new Date(new Date(input.toDate + "T23:59:59+07:00").getTime()) : undefined
  // Chỉ xuất đơn trong phạm vi xem của người xuất (checklist ALG 4.10)
  const saleId = (await resolveSaleScope(ctx)) ?? undefined
  const orders = await queryOrdersForExport(ctx, { source: input.source, fromDate: parsedFrom, toDate: parsedTo, saleId })

  // ── Sheet 1: Danh sách đơn hàng ─────────────────────────────────────────
  const orderRows = orders.map((o, idx) => {
    const addr = (typeof o.delivery_address === "object" && o.delivery_address !== null)
      ? (o.delivery_address as Record<string, unknown>)
      : null
    const window = (typeof o.delivery_window === "object" && o.delivery_window !== null)
      ? (o.delivery_window as Record<string, unknown>)
      : null
    const session = o.greeting_sessions[0]
    const totalCollected = o.payments.reduce(
      (sum: number, p: { amount_vnd: unknown }) => sum + Number(p.amount_vnd),
      0
    )

    const recipientName = (addr?.recipientName as string) || o.customer?.name || session?.customer_name || ""
    const recipientPhone = (addr?.phone as string) || o.customer?.phone || session?.customer_phone || ""
    const addressStr = (addr?.formattedAddress as string) || [
      addr?.street,
      addr?.zone,
      addr?.ward,
      addr?.district,
      addr?.province || addr?.city,
    ].filter(Boolean).join(", ") || (typeof o.delivery_address === "string" ? o.delivery_address : "")
    const deliveryNote = (addr?.notes as string) || ""

    return {
      "STT": idx + 1,
      "Mã đơn": o.code,
      "Nguồn": sourceLabel(o.source),
      "Ngày tạo": toVnDateString(o.created_at),
      "Trạng thái đơn": statusLabel(o.status),
      "Tiến độ cắm": productionLabel(o.production_status),
      "Giao hàng": deliveryLabel(o.delivery_status),
      "Khách đặt": o.customer?.name ?? session?.customer_name ?? "",
      "SĐT khách đặt": o.customer?.phone ?? session?.customer_phone ?? "",
      "Người nhận hoa": recipientName,
      "SĐT nhận hoa": recipientPhone,
      "Địa chỉ giao hoa": addressStr,
      "Ngày giao": (window?.date as string) ?? "",
      "Khung giờ giao": (window?.timeSlot as string) ?? "",
      "Ghi chú giao": deliveryNote,
      "Lời chúc thiệp": o.card_message ?? "",
      "Ghi chú nội bộ": o.internal_note ?? "",
      "Mã link riêng": session?.send_code ?? "",
      "Tổng tiền (VNĐ)": Number(o.total_vnd),
      "Đã thu (VNĐ)": Number(o.paid_vnd),
      "Còn lại (VNĐ)": Number(o.balance_vnd),
      "Thực thu ghi nhận (VNĐ)": totalCollected,
      "Số mặt hàng": o.items.length,
    }
  })

  // ── Sheet 2: Chi tiết sản phẩm ──────────────────────────────────────────
  const itemRows: Record<string, unknown>[] = []
  for (const o of orders) {
    for (const it of o.items) {
      itemRows.push({
        "Mã đơn": o.code,
        "Ngày tạo": toVnDateString(o.created_at),
        "Trạng thái đơn": statusLabel(o.status),
        "Mã SP": it.product_id ?? "",
        "Mô tả sản phẩm": it.description ?? "",
        "Số lượng": it.quantity,
        "Đơn giá (VNĐ)": Number(it.unit_price_vnd),
        "Thành tiền (VNĐ)": it.quantity * Number(it.unit_price_vnd),
      })
    }
  }

  // ── Sheet 3: Lịch sử thu tiền ───────────────────────────────────────────
  const paymentRows: Record<string, unknown>[] = []
  for (const o of orders) {
    for (const p of o.payments) {
      paymentRows.push({
        "Mã đơn": o.code,
        "Loại": p.kind === "REFUND" ? "Hoàn tiền" : "Thu tiền",
        "Số tiền (VNĐ)": Number(p.amount_vnd),
        "Phương thức": p.payment_method ?? "",
        "Mã giao dịch / Biên nhận": p.reference ?? "",
        "Ngày thu": toVnDateString(p.collected_at),
        "Người thu": p.collected_by,
        "Ghi chú": p.note ?? "",
      })
    }
  }

  // ── Sheet 4: Phiên khách Thẻ Chào ───────────────────────────────────────
  const sessionRows: Record<string, unknown>[] = []
  for (const o of orders) {
    for (const s of o.greeting_sessions) {
      sessionRows.push({
        "Mã đơn": o.code,
        "Mã link (Send Code)": s.send_code,
        "Tên khách (Bộ sưu tập riêng)": s.customer_name ?? "",
        "SĐT khách (Bộ sưu tập riêng)": s.customer_phone ?? "",
        "Sale phụ trách": s.sale_id,
        "Trạng thái link": s.status,
      })
    }
  }

  // ── Tạo workbook ────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()

  const wsOrders = XLSX.utils.json_to_sheet(orderRows.length > 0 ? orderRows : [{ "Thông báo": "Không có đơn hàng trong khoảng thời gian đã chọn" }])
  wsOrders["!cols"] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã đơn
    { wch: 12 }, // Nguồn
    { wch: 20 }, // Ngày tạo
    { wch: 14 }, // Trạng thái đơn
    { wch: 14 }, // Tiến độ cắm
    { wch: 14 }, // Giao hàng
    { wch: 20 }, // Khách đặt
    { wch: 14 }, // SĐT khách đặt
    { wch: 20 }, // Người nhận hoa
    { wch: 14 }, // SĐT nhận hoa
    { wch: 38 }, // Địa chỉ giao hoa
    { wch: 12 }, // Ngày giao
    { wch: 16 }, // Khung giờ giao
    { wch: 24 }, // Ghi chú giao
    { wch: 30 }, // Lời chúc thiệp
    { wch: 30 }, // Ghi chú nội bộ
    { wch: 16 }, // Mã link riêng
    { wch: 16 }, // Tổng tiền (VNĐ)
    { wch: 14 }, // Đã thu (VNĐ)
    { wch: 14 }, // Còn lại (VNĐ)
    { wch: 18 }, // Thực thu ghi nhận (VNĐ)
    { wch: 12 }, // Số mặt hàng
  ]
  XLSX.utils.book_append_sheet(wb, wsOrders, "Đơn hàng")

  if (itemRows.length > 0) {
    const wsItems = XLSX.utils.json_to_sheet(itemRows)
    wsItems["!cols"] = [
      { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 12 },
      { wch: 32 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
    ]
    XLSX.utils.book_append_sheet(wb, wsItems, "Chi tiết SP")
  }

  if (paymentRows.length > 0) {
    const wsPayments = XLSX.utils.json_to_sheet(paymentRows)
    wsPayments["!cols"] = [
      { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
      { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 28 },
    ]
    XLSX.utils.book_append_sheet(wb, wsPayments, "Sổ thu tiền")
  }

  if (sessionRows.length > 0) {
    const wsSessions = XLSX.utils.json_to_sheet(sessionRows)
    wsSessions["!cols"] = [
      { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 24 }, { wch: 18 },
    ]
    XLSX.utils.book_append_sheet(wb, wsSessions, "Bộ sưu tập riêng")
  }

  const raw = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  return new Uint8Array(raw)
}
