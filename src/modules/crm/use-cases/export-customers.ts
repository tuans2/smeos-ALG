/**
 * Use-case: Sao lưu & Xuất danh sách khách hàng ra Excel (.xlsx) hoặc JSON.
 *
 * Hỗ trợ 2 định dạng:
 *   1. XLSX: Bảng tính gồm 2 sheet (Khách hàng + Ngày kỷ niệm/Dịp đặc biệt).
 *   2. JSON: File backup cấu trúc đầy đủ phục vụ lưu trữ dự phòng, khôi phục.
 */

import type { TenantContext } from "@/core/tenancy"
import { queryCustomersForExport } from "../infra/customer-export-query"
import * as XLSX from "xlsx"

const VN_OFFSET_MS = 7 * 60 * 60 * 1000

function toVnDateString(date: Date | null): string {
  if (!date) return ""
  const vn = new Date(date.getTime() + VN_OFFSET_MS)
  return vn.toISOString().replace("T", " ").slice(0, 19)
}

function tierLabel(tier: string): string {
  const map: Record<string, string> = {
    NEW: "Mới",
    BRONZE: "Đồng",
    SILVER: "Bạc",
    GOLD: "Vàng",
    VIP: "VIP",
  }
  return map[tier] ?? tier
}

export interface ExportCustomersInput {
  format?: "xlsx" | "json" | undefined
  tier?: string | undefined
  search?: string | undefined
}

export interface CustomerBackupResult {
  contentType: string
  filename: string
  data: Uint8Array | string
}

export async function exportCustomers(
  ctx: TenantContext,
  input: ExportCustomersInput = {}
): Promise<CustomerBackupResult> {
  const format = input.format ?? "xlsx"
  const now = new Date()
  const dateSuffix = now.toISOString().slice(0, 10).replace(/-/g, "")

  const customersList = await queryCustomersForExport(ctx, { tier: input.tier, search: input.search })

  if (format === "json") {
    let totalOccasions = 0
    const serializedCustomers = customersList.map((c) => {
      totalOccasions += c.occasions.length
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        tier: c.tier,
        notes: c.notes,
        tags: c.tags,
        preferred_flowers: c.preferred_flowers,
        preferred_colors: c.preferred_colors,
        total_spent: Number(c.total_spent),
        order_count: c.order_count,
        last_order_at: c.last_order_at ? c.last_order_at.toISOString() : null,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
        occasions: c.occasions.map((occ) => ({
          id: occ.id,
          name: occ.name,
          date: occ.date,
          is_recurring: occ.is_recurring,
          notes: occ.notes,
          created_at: occ.created_at.toISOString(),
        })),
      }
    })

    const payload = {
      metadata: {
        version: "1.0",
        backup_type: "customer_master_data",
        organization_id: ctx.organizationId,
        exported_at: now.toISOString(),
        total_customers: serializedCustomers.length,
        total_occasions: totalOccasions,
      },
      customers: serializedCustomers,
    }

    return {
      contentType: "application/json; charset=utf-8",
      filename: `backup-khach-hang-${dateSuffix}.json`,
      data: JSON.stringify(payload, null, 2),
    }
  }

  // ── Sheet 1: Danh sách khách hàng ───────────────────────────────────────
  const customerRows = customersList.map((c, idx) => ({
    "STT": idx + 1,
    "Mã KH": c.code,
    "Họ và tên": c.name,
    "Số điện thoại": c.phone,
    "Email": c.email ?? "",
    "Địa chỉ": c.address ?? "",
    "Hạng khách hàng": tierLabel(c.tier),
    "Tổng chi tiêu (VNĐ)": Number(c.total_spent),
    "Số đơn đã mua": c.order_count,
    "Lần mua gần nhất": toVnDateString(c.last_order_at),
    "Hoa ưa thích": c.preferred_flowers.join(", "),
    "Tông màu ưa thích": c.preferred_colors.join(", "),
    "Nhãn (Tags)": c.tags.join(", "),
    "Ghi chú": c.notes ?? "",
    "Ngày tạo hồ sơ": toVnDateString(c.created_at),
  }))

  // ── Sheet 2: Danh sách ngày kỷ niệm ────────────────────────────────────
  const occasionRows: Record<string, unknown>[] = []
  for (const c of customersList) {
    for (const occ of c.occasions) {
      occasionRows.push({
        "Mã KH": c.code,
        "Tên khách hàng": c.name,
        "Số điện thoại": c.phone,
        "Dịp kỷ niệm": occ.name,
        "Ngày kỷ niệm (MM-DD)": occ.date,
        "Lặp lại hàng năm": occ.is_recurring ? "Có" : "Không",
        "Ghi chú kỷ niệm": occ.notes ?? "",
        "Ngày tạo": toVnDateString(occ.created_at),
      })
    }
  }

  const wb = XLSX.utils.book_new()

  const wsCustomers = XLSX.utils.json_to_sheet(
    customerRows.length > 0
      ? customerRows
      : [{ "Thông báo": "Không có khách hàng nào trong hệ thống" }]
  )
  wsCustomers["!cols"] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Mã KH
    { wch: 22 }, // Họ và tên
    { wch: 14 }, // SĐT
    { wch: 24 }, // Email
    { wch: 36 }, // Địa chỉ
    { wch: 14 }, // Hạng
    { wch: 18 }, // Tổng chi tiêu
    { wch: 12 }, // Số đơn
    { wch: 20 }, // Lần mua gần nhất
    { wch: 24 }, // Hoa ưa thích
    { wch: 20 }, // Màu ưa thích
    { wch: 20 }, // Tags
    { wch: 28 }, // Ghi chú
    { wch: 20 }, // Ngày tạo
  ]
  XLSX.utils.book_append_sheet(wb, wsCustomers, "Khách hàng")

  if (occasionRows.length > 0) {
    const wsOccasions = XLSX.utils.json_to_sheet(occasionRows)
    wsOccasions["!cols"] = [
      { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 22 },
      { wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 20 },
    ]
    XLSX.utils.book_append_sheet(wb, wsOccasions, "Ngày kỷ niệm")
  }

  const raw = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const buf = new Uint8Array(raw)

  return {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `danh-sach-khach-hang-${dateSuffix}.xlsx`,
    data: buf,
  }
}
